package inundation

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/google/googledrive"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"mime"

	"go.mongodb.org/mongo-driver/bson"
)

type TaskType string

const (
	TaskTypeReport TaskType = "report"
	TaskTypeUpdate TaskType = "update"
)

type syncTask struct {
	ID   string
	Type TaskType
}

type SyncWorker struct {
	InundationReportRepo repository.InundationReport
	inundationUpdateRepo repository.InundationUpdate
	orgRepo              repository.Organization
	driveSvc             googledrive.Service

	// Helper functions from the service for dynamic folder resolution
	resolveUploadFolder func(ctx context.Context, org *models.Organization, dataType string, pointID string) (string, error)

	// Unbounded Queue Management
	queue       []syncTask
	mu          sync.Mutex
	cond        *sync.Cond
	workerCount int
	done        chan struct{}
}

func NewSyncWorker(
	InundationReportRepo repository.InundationReport,
	inundationUpdateRepo repository.InundationUpdate,
	orgRepo repository.Organization,
	driveSvc googledrive.Service,
	resolveUploadFolder func(ctx context.Context, org *models.Organization, dataType string, pointID string) (string, error),
) *SyncWorker {
	w := &SyncWorker{
		InundationReportRepo: InundationReportRepo,
		inundationUpdateRepo: inundationUpdateRepo,
		orgRepo:              orgRepo,
		driveSvc:             driveSvc,
		resolveUploadFolder:  resolveUploadFolder,
		queue:                make([]syncTask, 0),
		workerCount:          3, // Default consistent workers
		done:                 make(chan struct{}),
	}
	w.cond = sync.NewCond(&w.mu)
	return w
}

func (w *SyncWorker) Enqueue(id string, taskType TaskType) {
	if id == "" {
		return
	}

	w.mu.Lock()
	w.queue = append(w.queue, syncTask{ID: id, Type: taskType})
	w.mu.Unlock()

	// Wake up one worker to process the task
	w.cond.Signal()
}

func (w *SyncWorker) Start() {
	// 1. Startup Scan: Process any existing leftover local images
	w.syncLocalImages()

	// 2. Start Worker Pool
	for i := 0; i < w.workerCount; i++ {
		go w.workerLoop(i)
	}

	// 3. Periodic Background Ticker Task
	go func() {
		syncTicker := time.NewTicker(5 * time.Minute) // Safety net for sync
		cleanTicker := time.NewTicker(12 * time.Hour) // Cleanup orphaned files
		defer syncTicker.Stop()
		defer cleanTicker.Stop()

		for {
			select {
			case <-syncTicker.C:
				w.syncLocalImages()
			case <-cleanTicker.C:
				w.cleanOrphanedFiles()
			case <-w.done:
				return
			}
		}
	}()
}

func (w *SyncWorker) workerLoop(id int) {
	fmt.Printf("SyncWorker Pool [%d]: Starting...\n", id)
	for {
		var task syncTask

		w.mu.Lock()
		for len(w.queue) == 0 {
			// Check if we are shutting down
			select {
			case <-w.done:
				w.mu.Unlock()
				return
			default:
				// Wait for a task
				w.cond.Wait()
			}
		}

		// If we reached here, there is at least one task in the queue
		// and we hold the lock.

		// Double check if we are stopping before popping
		select {
		case <-w.done:
			w.mu.Unlock()
			return
		default:
		}

		// Pop task from queue
		task = w.queue[0]
		w.queue = w.queue[1:]
		w.mu.Unlock()

		// Process the task without holding the lock
		w.processTask(task)
	}
}

func (w *SyncWorker) Stop() {
	close(w.done)
	// Wake up all workers so they can see the close(done) signal
	w.cond.Broadcast()
}

func (w *SyncWorker) processTask(task syncTask) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	if task.Type == TaskTypeReport {
		report, err := w.InundationReportRepo.GetByID(ctx, task.ID)
		if err == nil && report != nil {
			w.processReportSync(ctx, report)
		}
	} else if task.Type == TaskTypeUpdate {
		update, err := w.inundationUpdateRepo.GetByID(ctx, task.ID)
		if err == nil && update != nil {
			w.processUpdateSync(ctx, update)
		}
	}
}

func (w *SyncWorker) cleanOrphanedFiles() {
	ctx := context.Background()
	activePaths, err := w.getActiveLocalPaths(ctx)
	if err != nil {
		fmt.Printf("SyncWorker Cleanup: Failed to fetch active paths: %v\n", err)
		return
	}

	baseDir := "uploads/inundation_tmp"
	entries, err := os.ReadDir(baseDir)
	if err != nil {
		return
	}

	now := time.Now()
	retention := 24 * time.Hour
	deletedCount := 0

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		relPath := filepath.Join("inundation_tmp", entry.Name())

		// If file is still referenced in DB as local, DO NOT DELETE IT
		if activePaths[relPath] {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			continue
		}

		// If file is older than retention period and NO LONGER IN DB, delete it
		if now.Sub(info.ModTime()) > retention {
			err := os.Remove(filepath.Join(baseDir, entry.Name()))
			if err == nil {
				deletedCount++
			}
		}
	}

	if deletedCount > 0 {
		fmt.Printf("SyncWorker: Cleaned up %d orphaned temporary files (Age > 24h and unreferenced in DB)\n", deletedCount)
	}
}

func (w *SyncWorker) getActiveLocalPaths(ctx context.Context) (map[string]bool, error) {
	activePaths := make(map[string]bool)

	// 1. Scan Reports for local paths
	rf := filter.NewPaginationFilter()
	rf.PerPage = 1000
	rf.AddWhere("images", "images", bson.M{"$regex": "^local:"})

	reports, _, err := w.InundationReportRepo.List(ctx, rf)
	if err == nil {
		for _, r := range reports {
			for _, img := range r.Images {
				if strings.HasPrefix(img, "local:") {
					activePaths[strings.TrimPrefix(img, "local:")] = true
				}
			}
			for _, img := range r.SurveyImages {
				if strings.HasPrefix(img, "local:") {
					activePaths[strings.TrimPrefix(img, "local:")] = true
				}
			}
			for _, img := range r.MechImages {
				if strings.HasPrefix(img, "local:") {
					activePaths[strings.TrimPrefix(img, "local:")] = true
				}
			}
		}
	}

	// 2. Scan Updates for local paths
	uf := filter.NewPaginationFilter()
	uf.PerPage = 1000
	uf.AddWhere("images", "images", bson.M{"$regex": "^local:"})

	updates, _, err := w.inundationUpdateRepo.List(ctx, uf)
	if err == nil {
		for _, u := range updates {
			for _, img := range u.Images {
				if strings.HasPrefix(img, "local:") {
					activePaths[strings.TrimPrefix(img, "local:")] = true
				}
			}
			for _, img := range u.SurveyImages {
				if strings.HasPrefix(img, "local:") {
					activePaths[strings.TrimPrefix(img, "local:")] = true
				}
			}
			for _, img := range u.MechImages {
				if strings.HasPrefix(img, "local:") {
					activePaths[strings.TrimPrefix(img, "local:")] = true
				}
			}
		}
	}

	return activePaths, nil
}

func (w *SyncWorker) syncLocalImages() {
	ctx := context.Background()

	// 1. Scan Reports
	f := filter.NewPaginationFilter()
	f.PerPage = 100
	f.AddWhere("has_local_files", "", bson.M{
		"$or": []bson.M{
			{"images": bson.M{"$regex": "^local:"}},
			{"survey_images": bson.M{"$regex": "^local:"}},
			{"mech_images": bson.M{"$regex": "^local:"}},
		},
	})

	reports, _, err := w.InundationReportRepo.List(ctx, f)
	if err == nil {
		for _, r := range reports {
			w.processReportSync(ctx, r)
		}
	}

	// 2. Scan Updates
	uf := filter.NewPaginationFilter()
	uf.PerPage = 100
	uf.AddWhere("has_local_files", "", bson.M{
		"$or": []bson.M{
			{"images": bson.M{"$regex": "^local:"}},
			{"survey_images": bson.M{"$regex": "^local:"}},
			{"mech_images": bson.M{"$regex": "^local:"}},
		},
	})

	updates, _, err := w.inundationUpdateRepo.List(ctx, uf)
	if err == nil {
		for _, u := range updates {
			w.processUpdateSync(ctx, u)
		}
	}
}

func (w *SyncWorker) processReportSync(ctx context.Context, report *models.InundationReport) {
	org, err := w.orgRepo.GetByID(ctx, report.OrgID)
	if err != nil {
		return
	}

	folderID, err := w.resolveUploadFolder(ctx, org, "FLOOD", report.PointID)
	if err != nil {
		return
	}

	newImages, modified := w.uploadImageSlice(ctx, folderID, report.Images)
	newSurveyImages, surveyMod := w.uploadImageSlice(ctx, folderID, report.SurveyImages)
	newMechImages, mechMod := w.uploadImageSlice(ctx, folderID, report.MechImages)

	if modified || surveyMod || mechMod {
		report.Images = newImages
		report.SurveyImages = newSurveyImages
		report.MechImages = newMechImages
		_ = w.InundationReportRepo.Update(ctx, report)
		fmt.Printf("SyncWorker: Successfully synced/cleaned images for report %s\n", report.ID)
	}
}

func (w *SyncWorker) processUpdateSync(ctx context.Context, update *models.InundationUpdate) {
	report, err := w.InundationReportRepo.GetByID(ctx, update.ReportID)
	if err != nil {
		return
	}

	org, err := w.orgRepo.GetByID(ctx, report.OrgID)
	if err != nil {
		return
	}

	folderID, err := w.resolveUploadFolder(ctx, org, "FLOOD", report.PointID)
	if err != nil {
		return
	}

	newImages, modified := w.uploadImageSlice(ctx, folderID, update.Images)
	newSurveyImages, surveyMod := w.uploadImageSlice(ctx, folderID, update.SurveyImages)
	newMechImages, mechMod := w.uploadImageSlice(ctx, folderID, update.MechImages)

	if modified || surveyMod || mechMod {
		update.Images = newImages
		update.SurveyImages = newSurveyImages
		update.MechImages = newMechImages
		_ = w.inundationUpdateRepo.Update(ctx, update)
		fmt.Printf("SyncWorker: Successfully synced/cleaned images for update %s\n", update.ID)
	}
}

func (w *SyncWorker) uploadImageSlice(ctx context.Context, folderID string, images []string) ([]string, bool) {
	newImages := make([]string, 0, len(images))
	modified := false

	for _, imgPath := range images {
		if strings.HasPrefix(imgPath, "local:") {
			relPath := strings.TrimPrefix(imgPath, "local:")
			fullPath := filepath.Join("uploads", relPath)

			file, err := os.Open(fullPath)
			if err != nil {
				if os.IsNotExist(err) {
					fmt.Printf("SyncWorker: Local file %s missing, removing reference\n", fullPath)
					modified = true
				} else {
					fmt.Printf("SyncWorker: Error opening local file %s: %v\n", fullPath, err)
					newImages = append(newImages, imgPath)
				}
				continue
			}

			fileName := filepath.Base(relPath)
			ext := filepath.Ext(fileName)
			mimeType := mime.TypeByExtension(ext)
			if mimeType == "" {
				mimeType = "image/jpeg" // Fallback
			}

			driveID, err := w.driveSvc.UploadFileSimple(ctx, folderID, fileName, mimeType, file)
			file.Close()

			if err != nil {
				fmt.Printf("SyncWorker: Error uploading file %s to drive: %v\n", relPath, err)
				newImages = append(newImages, imgPath)
				continue
			}

			newImages = append(newImages, driveID)
			modified = true
			_ = os.Remove(fullPath)
		} else {
			newImages = append(newImages, imgPath)
		}
	}

	return newImages, modified
}
