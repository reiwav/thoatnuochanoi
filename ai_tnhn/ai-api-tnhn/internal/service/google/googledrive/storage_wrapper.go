package googledrive

import (
	"ai-api-tnhn/internal/service/storage"
	"context"
	"fmt"
	"io"
	"strings"
)

type storageWrapper struct {
	storageSvc storage.Service
	driveSvc   Service
}

func NewStorageWrapper(storageSvc storage.Service, driveSvc Service) Service {
	return &storageWrapper{storageSvc: storageSvc, driveSvc: driveSvc}
}

func (w *storageWrapper) UploadFile(ctx context.Context, fID, n, m string, c io.Reader, conv bool) (string, error) {
	if w.driveSvc != nil {
		return w.driveSvc.UploadFile(ctx, fID, n, m, c, conv)
	}
	return w.storageSvc.UploadFile(ctx, fID, n, m, c, conv)
}

func (w *storageWrapper) UploadFileSimple(ctx context.Context, fID, n, m string, c io.Reader) (string, error) {
	if w.driveSvc != nil {
		return w.driveSvc.UploadFileSimple(ctx, fID, n, m, c)
	}
	return w.storageSvc.UploadFileSimple(ctx, fID, n, m, c)
}

func (w *storageWrapper) CreateFolder(ctx context.Context, pID, n string) (string, error) {
	if w.driveSvc != nil {
		return w.driveSvc.CreateFolder(ctx, pID, n)
	}
	return w.storageSvc.CreateFolder(ctx, pID, n)
}

func (w *storageWrapper) CreateOrgFolder(ctx context.Context, n string) (string, error) {
	if w.driveSvc != nil {
		return w.driveSvc.CreateOrgFolder(ctx, n)
	}
	return w.storageSvc.CreateFolder(ctx, ".", n)
}

func (w *storageWrapper) InitOrgFolders(ctx context.Context, n string) (string, error) {
	var dID string
	if w.driveSvc != nil {
		dID, _ = w.driveSvc.InitOrgFolders(ctx, n)
	}
	oID, _ := w.storageSvc.CreateFolder(ctx, ".", n)
	for _, sub := range DefaultSubfolders {
		_, _ = w.storageSvc.CreateFolder(ctx, oID, sub)
	}
	if w.driveSvc != nil {
		return dID, nil
	}
	return oID, nil
}

func (w *storageWrapper) FindOrCreateFolder(ctx context.Context, pID, n string) (string, error) {
	if w.driveSvc != nil {
		return w.driveSvc.FindOrCreateFolder(ctx, pID, n)
	}
	return w.storageSvc.CreateFolder(ctx, pID, n)
}

func (w *storageWrapper) TriggerReportGeneration(ctx context.Context, wh, tID, tgID string, p map[string]interface{}) (string, error) {
	if w.driveSvc == nil {
		return "", fmt.Errorf("drive required")
	}
	return w.driveSvc.TriggerReportGeneration(ctx, wh, tID, tgID, p)
}

func (w *storageWrapper) CopyFile(ctx context.Context, fID, pID, n string) (string, error) {
	if w.driveSvc == nil {
		return "", fmt.Errorf("drive required")
	}
	return w.driveSvc.CopyFile(ctx, fID, pID, n)
}

func (w *storageWrapper) MoveFile(ctx context.Context, id, pID string) error {
	if w.driveSvc == nil {
		return fmt.Errorf("drive required")
	}
	return w.driveSvc.MoveFile(ctx, id, pID)
}

func (w *storageWrapper) GetFileContent(ctx context.Context, id string) ([]byte, error) {
	id = strings.TrimSpace(id)
	if strings.HasPrefix(id, "/api/storage/file/") {
		return w.storageSvc.GetFileContent(ctx, id)
	}
	if w.driveSvc == nil {
		return nil, fmt.Errorf("drive required")
	}
	return w.driveSvc.GetFileContent(ctx, id)
}

func (w *storageWrapper) SetPublic(ctx context.Context, id string) error {
	if w.driveSvc != nil {
		return w.driveSvc.SetPublic(ctx, id)
	}
	return w.storageSvc.SetPublic(ctx, id)
}

func (w *storageWrapper) GetFolderLink(ctx context.Context, id string) string {
	if w.driveSvc != nil {
		return w.driveSvc.GetFolderLink(ctx, id)
	}
	return ""
}

func (w *storageWrapper) ListFiles(ctx context.Context, id string) ([]FileInfo, error) {
	if w.driveSvc != nil {
		return w.driveSvc.ListFiles(ctx, id)
	}
	return nil, nil
}

func (w *storageWrapper) DeleteFile(ctx context.Context, id string) error {
	if w.driveSvc != nil {
		return w.driveSvc.DeleteFile(ctx, id)
	}
	return fmt.Errorf("drive required")
}
