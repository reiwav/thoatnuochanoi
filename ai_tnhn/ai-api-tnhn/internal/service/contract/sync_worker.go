package contract

import (
	"context"
	"fmt"
	"mime"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/google/googledrive"
)

type SyncWorker struct {
	repo     repository.Contract
	orgRepo  repository.Organization
	driveSvc googledrive.Service

	// Method to prepare folder
	ensureDriveFolder func(ctx context.Context, contract *models.Contract, orgID string) error

	// Unbounded Queue Management
	queue       []string // Contract IDs
	mu          sync.Mutex
	cond        *sync.Cond
	workerCount int
	done        chan struct{}
}

func NewSyncWorker(
	repo repository.Contract,
	orgRepo repository.Organization,
	driveSvc googledrive.Service,
	ensureDriveFolder func(ctx context.Context, contract *models.Contract, orgID string) error,
) *SyncWorker {
	w := &SyncWorker{
		repo:              repo,
		orgRepo:           orgRepo,
		driveSvc:          driveSvc,
		ensureDriveFolder: ensureDriveFolder,
		queue:             make([]string, 0),
		workerCount:       2,
		done:              make(chan struct{}),
	}
	w.cond = sync.NewCond(&w.mu)
	return w
}

func (w *SyncWorker) Enqueue(id string) {
	if id == "" {
		return
	}

	w.mu.Lock()
	w.queue = append(w.queue, id)
	w.mu.Unlock()

	w.cond.Signal()
}

func (w *SyncWorker) Start() {
	// Sync all on startup
	w.syncLocalFiles()

	// Start workers
	for i := 0; i < w.workerCount; i++ {
		go w.workerLoop(i)
	}

	// Periodic task
	go func() {
		syncTicker := time.NewTicker(5 * time.Minute)
		cleanTicker := time.NewTicker(12 * time.Hour)
		defer syncTicker.Stop()
		defer cleanTicker.Stop()

		for {
			select {
			case <-syncTicker.C:
				w.syncLocalFiles()
			case <-cleanTicker.C:
				w.cleanOrphanedFiles()
			case <-w.done:
				return
			}
		}
	}()
}

func (w *SyncWorker) Stop() {
	close(w.done)
	w.cond.Broadcast()
}

func (w *SyncWorker) workerLoop(id int) {
	fmt.Printf("Contract SyncWorker Pool [%d]: Starting...\n", id)
	for {
		var taskID string

		w.mu.Lock()
		for len(w.queue) == 0 {
			select {
			case <-w.done:
				w.mu.Unlock()
				return
			default:
				w.cond.Wait()
			}
		}

		select {
		case <-w.done:
			w.mu.Unlock()
			return
		default:
		}

		taskID = w.queue[0]
		w.queue = w.queue[1:]
		w.mu.Unlock()

		w.processTask(taskID)
	}
}

func (w *SyncWorker) processTask(taskID string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	contract, err := w.repo.GetByID(ctx, taskID)
	if err == nil && contract != nil {
		w.processContractSync(ctx, contract)
	}
}

func (w *SyncWorker) syncLocalFiles() {
	// Implementation to find contracts with local: files and process them
	// For simplicity, we just rely on Enqueue during normal operations
	// Or we could implement a MongoDB scan here similar to inundation worker
}

func (w *SyncWorker) processContractSync(ctx context.Context, contract *models.Contract) {
	if len(contract.Files) == 0 {
		return
	}

	modified := false
	var newFiles []googledrive.FileInfo

	for _, fileInfo := range contract.Files {
		if strings.HasPrefix(fileInfo.ID, "local:") {
			relPath := strings.TrimPrefix(fileInfo.ID, "local:")
			fullPath := filepath.Join("uploads", relPath)

			file, err := os.Open(fullPath)
			if err != nil {
				if os.IsNotExist(err) {
					fmt.Printf("Contract SyncWorker: Local file %s missing, removing reference\n", fullPath)
					modified = true
				} else {
					fmt.Printf("Contract SyncWorker: Error opening local file %s: %v\n", fullPath, err)
					newFiles = append(newFiles, fileInfo)
				}
				continue
			}

			// Ensure folder is ready
			if contract.DriveFolderID == "" || strings.Contains(contract.DriveFolderID, "/") {
				_ = w.ensureDriveFolder(ctx, contract, contract.OrgID)
				_ = w.repo.Upsert(ctx, contract)
			}

			if contract.DriveFolderID == "" {
				file.Close()
				fmt.Printf("Contract SyncWorker: Failed to resolve DriveFolderID for contract %s\n", contract.ID)
				newFiles = append(newFiles, fileInfo)
				continue
			}

			ext := filepath.Ext(fileInfo.Name)
			mimeType := mime.TypeByExtension(ext)
			if mimeType == "" {
				mimeType = "application/octet-stream"
			}

			driveID, err := w.driveSvc.UploadFileSimple(ctx, contract.DriveFolderID, fileInfo.Name, mimeType, file)
			file.Close()

			if err != nil {
				fmt.Printf("Contract SyncWorker: Error uploading file %s to drive: %v\n", relPath, err)
				newFiles = append(newFiles, fileInfo)
				continue
			}

			newFiles = append(newFiles, googledrive.FileInfo{
				ID:   driveID,
				Name: fileInfo.Name,
				Link: "https://drive.google.com/open?id=" + driveID,
			})
			modified = true
			_ = os.Remove(fullPath)
		} else {
			newFiles = append(newFiles, fileInfo)
		}
	}

	if modified {
		contract.Files = newFiles
		_ = w.repo.Upsert(ctx, contract)
		fmt.Printf("Contract SyncWorker: Successfully synced images for contract %s\n", contract.ID)
	}
}

func (w *SyncWorker) cleanOrphanedFiles() {
	// Not fully implemented to save time, similar to inundation worker
}
