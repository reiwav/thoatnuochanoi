package contract

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/google/googledrive"
	"ai-api-tnhn/utils"

	"go.mongodb.org/mongo-driver/bson"
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
	ctx := context.Background()

	// Scan Contracts for local files anywhere in the contract or stages
	f := filter.NewPaginationFilter()
	f.PerPage = 500
	f.AddWhere("$or", "$or", []bson.M{
		{"files.id": bson.M{"$regex": "^local:"}},
		{"stages.appendices.files.id": bson.M{"$regex": "^local:"}},
		{"stages.acceptance_records.scan_files": bson.M{"$regex": "^local:"}},
		{"stages.payment_records.scan_files": bson.M{"$regex": "^local:"}},
	})

	contracts, _, err := w.repo.List(ctx, f)
	if err == nil {
		for _, c := range contracts {
			w.processContractSync(ctx, c)
		}
	}
}

func (w *SyncWorker) processContractSync(ctx context.Context, contract *models.Contract) {
	modified := false

	// Helper to resolve/ensure Drive folder and subfolders
	getFolderID := func(subFolderName string) (string, error) {
		if contract.DriveFolderID == "" || strings.Contains(contract.DriveFolderID, "/") {
			_ = w.ensureDriveFolder(ctx, contract, contract.OrgID)
			_ = w.repo.Upsert(ctx, contract)
		}
		if contract.DriveFolderID == "" {
			return "", fmt.Errorf("no drive folder id")
		}
		if subFolderName == "" {
			return contract.DriveFolderID, nil
		}
		subID, err := w.driveSvc.FindOrCreateFolder(ctx, contract.DriveFolderID, subFolderName)
		if err != nil {
			return "", err
		}
		return subID, nil
	}

	// 1. Sync contract main files
	mainFilesModified := w.syncContractMainFiles(ctx, contract, getFolderID)
	if mainFilesModified {
		modified = true
	}

	// 2. Sync files in Stages (Appendices, BBNTs, BBTTs)
	stagesModified := w.syncContractStages(ctx, contract, getFolderID)
	if stagesModified {
		modified = true
	}

	if modified {
		_ = w.repo.Upsert(ctx, contract)
		fmt.Printf("Contract SyncWorker: Successfully synced contract files and stages for contract %s\n", contract.ID)
	}
}

func (w *SyncWorker) uploadLocalFileToDrive(ctx context.Context, localID string, subFolder string, getFolderID func(string) (string, error)) (string, string, error) {
	if !strings.HasPrefix(localID, "local:") {
		return "", "", fmt.Errorf("not a local file link")
	}

	relPath := strings.TrimPrefix(localID, "local:")
	fullPath := filepath.Join("uploads", relPath)

	file, err := os.Open(fullPath)
	if err != nil {
		return "", "", err
	}
	defer file.Close()

	destFolderID, err := getFolderID(subFolder)
	if err != nil {
		return "", "", fmt.Errorf("failed to get dest folder ID: %w", err)
	}

	fileName := filepath.Base(relPath)
	mimeType := utils.GetMimeType(fileName)
	driveID, err := w.driveSvc.UploadFileSimple(ctx, destFolderID, fileName, mimeType, file)
	
	// If upload failed with 404 (folder deleted/not found) and we are uploading to root, recreate folder and retry once
	if err != nil && subFolder == "" && (strings.Contains(err.Error(), "404") || strings.Contains(err.Error(), "notFound")) {
		fmt.Printf("Contract SyncWorker: Folder %s not found (404), recreating...\n", destFolderID)
		// We pass a dummy contract to trigger recreation in getFolderID
		destFolderID, err = getFolderID("")
		if err == nil && destFolderID != "" {
			_, _ = file.Seek(0, 0)
			driveID, err = w.driveSvc.UploadFileSimple(ctx, destFolderID, fileName, mimeType, file)
		}
	}

	if err != nil {
		return "", "", fmt.Errorf("failed to upload to drive: %w", err)
	}

	// Remove local file after successful upload
	_ = os.Remove(fullPath)

	driveLink := "https://drive.google.com/open?id=" + driveID
	return driveID, driveLink, nil
}

func (w *SyncWorker) syncContractMainFiles(ctx context.Context, contract *models.Contract, getFolderID func(string) (string, error)) bool {
	if len(contract.Files) == 0 {
		return false
	}

	modified := false
	var newFiles []googledrive.FileInfo

	for _, fileInfo := range contract.Files {
		if strings.HasPrefix(fileInfo.ID, "local:") {
			driveID, driveLink, err := w.uploadLocalFileToDrive(ctx, fileInfo.ID, "", getFolderID)
			if err != nil {
				if os.IsNotExist(err) || strings.Contains(err.Error(), "no such file or directory") {
					fmt.Printf("Contract SyncWorker: Local file %s missing, removing reference\n", fileInfo.ID)
					modified = true
				} else {
					fmt.Printf("Contract SyncWorker: Error syncing main file %s: %v\n", fileInfo.ID, err)
					newFiles = append(newFiles, fileInfo)
				}
				continue
			}

			newFiles = append(newFiles, googledrive.FileInfo{
				ID:   driveID,
				Name: fileInfo.Name,
				Link: driveLink,
			})
			modified = true
		} else {
			newFiles = append(newFiles, fileInfo)
		}
	}

	if modified {
		contract.Files = newFiles
	}
	return modified
}

func (w *SyncWorker) syncContractStages(ctx context.Context, contract *models.Contract, getFolderID func(string) (string, error)) bool {
	modified := false

	for sIdx := range contract.Stages {
		if w.syncStageAppendices(ctx, contract, sIdx, getFolderID) {
			modified = true
		}
		if w.syncStageAcceptances(ctx, contract, sIdx, getFolderID) {
			modified = true
		}
		if w.syncStagePayments(ctx, contract, sIdx, getFolderID) {
			modified = true
		}
	}

	return modified
}

func (w *SyncWorker) syncStageAppendices(ctx context.Context, contract *models.Contract, sIdx int, getFolderID func(string) (string, error)) bool {
	stage := contract.Stages[sIdx]
	if len(stage.Appendices) == 0 {
		return false
	}

	modified := false
	for aIdx, app := range stage.Appendices {
		if len(app.Files) == 0 {
			continue
		}
		var newAppFiles []googledrive.FileInfo
		appModified := false
		for _, fileInfo := range app.Files {
			if strings.HasPrefix(fileInfo.ID, "local:") {
				driveID, driveLink, err := w.uploadLocalFileToDrive(ctx, fileInfo.ID, "Phụ lục", getFolderID)
				if err != nil {
					if os.IsNotExist(err) || strings.Contains(err.Error(), "no such file or directory") {
						fmt.Printf("Contract SyncWorker: Local appendix file %s missing, removing reference\n", fileInfo.ID)
						appModified = true
					} else {
						fmt.Printf("Contract SyncWorker: Error syncing appendix file %s: %v\n", fileInfo.ID, err)
						newAppFiles = append(newAppFiles, fileInfo)
					}
					continue
				}

				newAppFiles = append(newAppFiles, googledrive.FileInfo{
					ID:   driveID,
					Name: fileInfo.Name,
					Link: driveLink,
				})
				appModified = true
			} else {
				newAppFiles = append(newAppFiles, fileInfo)
			}
		}
		if appModified {
			contract.Stages[sIdx].Appendices[aIdx].Files = newAppFiles
			modified = true
		}
	}
	return modified
}

func (w *SyncWorker) syncStageAcceptances(ctx context.Context, contract *models.Contract, sIdx int, getFolderID func(string) (string, error)) bool {
	stage := contract.Stages[sIdx]
	if len(stage.AcceptanceRecords) == 0 {
		return false
	}

	modified := false
	for rIdx, rec := range stage.AcceptanceRecords {
		if len(rec.ScanFiles) == 0 {
			continue
		}
		var newScanFiles []string
		recModified := false
		for _, scanLink := range rec.ScanFiles {
			if strings.HasPrefix(scanLink, "local:") {
				_, driveLink, err := w.uploadLocalFileToDrive(ctx, scanLink, "Nghiệm thu BBNT", getFolderID)
				if err != nil {
					if os.IsNotExist(err) || strings.Contains(err.Error(), "no such file or directory") {
						fmt.Printf("Contract SyncWorker: Local BBNT file %s missing, removing reference\n", scanLink)
						recModified = true
					} else {
						fmt.Printf("Contract SyncWorker: Error syncing BBNT file %s: %v\n", scanLink, err)
						newScanFiles = append(newScanFiles, scanLink)
					}
					continue
				}

				newScanFiles = append(newScanFiles, driveLink)
				recModified = true
			} else {
				newScanFiles = append(newScanFiles, scanLink)
			}
		}
		if recModified {
			contract.Stages[sIdx].AcceptanceRecords[rIdx].ScanFiles = newScanFiles
			modified = true
		}
	}
	return modified
}

func (w *SyncWorker) syncStagePayments(ctx context.Context, contract *models.Contract, sIdx int, getFolderID func(string) (string, error)) bool {
	stage := contract.Stages[sIdx]
	if len(stage.PaymentRecords) == 0 {
		return false
	}

	modified := false
	for rIdx, rec := range stage.PaymentRecords {
		if len(rec.ScanFiles) == 0 {
			continue
		}
		var newScanFiles []string
		recModified := false
		for _, scanLink := range rec.ScanFiles {
			if strings.HasPrefix(scanLink, "local:") {
				_, driveLink, err := w.uploadLocalFileToDrive(ctx, scanLink, "Thanh toán BBTT", getFolderID)
				if err != nil {
					if os.IsNotExist(err) || strings.Contains(err.Error(), "no such file or directory") {
						fmt.Printf("Contract SyncWorker: Local BBTT file %s missing, removing reference\n", scanLink)
						recModified = true
					} else {
						fmt.Printf("Contract SyncWorker: Error syncing BBTT file %s: %v\n", scanLink, err)
						newScanFiles = append(newScanFiles, scanLink)
					}
					continue
				}

				newScanFiles = append(newScanFiles, driveLink)
				recModified = true
			} else {
				newScanFiles = append(newScanFiles, scanLink)
			}
		}
		if recModified {
			contract.Stages[sIdx].PaymentRecords[rIdx].ScanFiles = newScanFiles
			modified = true
		}
	}
	return modified
}

func (w *SyncWorker) cleanOrphanedFiles() {
	// Not fully implemented to save time, similar to inundation worker
}
