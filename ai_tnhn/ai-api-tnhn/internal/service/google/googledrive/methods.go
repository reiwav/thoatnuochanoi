package googledrive

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"google.golang.org/api/drive/v3"
	"google.golang.org/api/googleapi"
)

func (s *service) UploadFile(ctx context.Context, folderID, name, mimeType string, content io.Reader, convert bool) (string, error) {
	f := &drive.File{Name: name, Parents: []string{folderID}}
	if convert {
		f.MimeType = "application/vnd.google-apps.document"
	} else if mimeType != "" {
		f.MimeType = mimeType
	}
	
	var mediaOpts []googleapi.MediaOption
	if mimeType != "" {
		mediaOpts = append(mediaOpts, googleapi.ContentType(mimeType))
	}
	res, err := s.driveSvc.Files.Create(f).Media(content, mediaOpts...).SupportsAllDrives(true).Do()
	if err != nil {
		return "", fmt.Errorf("failed to upload file: %w", err)
	}
	return res.Id, nil
}

func (s *service) UploadFileSimple(ctx context.Context, folderID, name, mimeType string, content io.Reader) (string, error) {
	return s.UploadFile(ctx, folderID, name, mimeType, content, false)
}

func (s *service) CreateFolder(ctx context.Context, parentID, name string) (string, error) {
	pID := parentID
	if pID == "" || pID == "." {
		pID = s.cfg.RootFolderID
	}
	if pID == "" {
		pID = "root"
	}
	f := &drive.File{Name: name, MimeType: "application/vnd.google-apps.folder", Parents: []string{pID}}
	res, err := s.driveSvc.Files.Create(f).SupportsAllDrives(true).Do()
	if err != nil {
		return "", fmt.Errorf("failed to create folder: %w", err)
	}
	return res.Id, nil
}

func (s *service) CreateOrgFolder(ctx context.Context, orgName string) (string, error) {
	return s.CreateFolder(ctx, s.cfg.RootFolderID, orgName)
}

func (s *service) IsValidDriveID(id string) bool {
	if len(id) < 15 || len(id) > 50 {
		return false
	}
	for _, r := range id {
		if !((r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' || r == '-') {
			return false
		}
	}
	return true
}

func (s *service) InitOrgFolders(ctx context.Context, orgName string, folderID string) (string, error) {
	if folderID != "" {
		return folderID, nil
	}
	return s.FindOrCreateFolder(ctx, s.cfg.RootFolderID, orgName)
}

func (s *service) FindOrCreateFolder(ctx context.Context, parentID, folderName string) (string, error) {
	pID := parentID
	if pID == "" || pID == "." {
		pID = s.cfg.RootFolderID
	}
	if pID == "" {
		pID = "root"
	}
	q := fmt.Sprintf("name = '%s' and mimeType = 'application/vnd.google-apps.folder' and '%s' in parents and trashed = false", folderName, pID)
	res, err := s.driveSvc.Files.List().Q(q).SupportsAllDrives(true).IncludeItemsFromAllDrives(true).Do()
	if err != nil {
		return "", fmt.Errorf("failed to search for folder '%s': %w", folderName, err)
	}
	if len(res.Files) > 0 {
		return res.Files[0].Id, nil
	}
	return s.CreateFolder(ctx, pID, folderName)
}

func (s *service) TriggerReportGeneration(ctx context.Context, webhookURL, templateID, targetID string, payload map[string]interface{}) (string, error) {
	data := map[string]interface{}{"doc_id": templateID, "targetFolderId": targetID, "data": payload}
	jsonBody, _ := json.Marshal(data)
	req, _ := http.NewRequestWithContext(ctx, "POST", webhookURL, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	fmt.Printf("[DEBUG] =========== Apps Script Response: %s\n", string(body))
	return string(body), nil
}

func (s *service) CopyFile(ctx context.Context, fileID, parentID, newName string) (string, error) {
	f, err := s.driveSvc.Files.Copy(fileID, &drive.File{Name: newName, Parents: []string{parentID}}).SupportsAllDrives(true).Do()
	if err != nil {
		return "", err
	}
	_ = s.SetPublic(ctx, f.Id)
	return f.Id, nil
}

func (s *service) GetFileContent(ctx context.Context, id string) ([]byte, error) {
	resp, err := s.driveSvc.Files.Get(id).Download()
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

func (s *service) SetPublic(ctx context.Context, id string) error {
	_, err := s.driveSvc.Permissions.Create(id, &drive.Permission{Type: "anyone", Role: "reader"}).SupportsAllDrives(true).Do()
	return err
}

func (s *service) MoveFile(ctx context.Context, id, parentID string) error {
	f, err := s.driveSvc.Files.Get(id).Fields("parents").Do()
	if err != nil {
		return err
	}
	_, err = s.driveSvc.Files.Update(id, nil).AddParents(parentID).RemoveParents(strings.Join(f.Parents, ",")).SupportsAllDrives(true).Do()
	return err
}

func (s *service) GetFolderLink(ctx context.Context, id string) string {
	return fmt.Sprintf("https://drive.google.com/drive/folders/%s", id)
}

func (s *service) ListFiles(ctx context.Context, id string) ([]FileInfo, error) {
	if id == "" || id == "." {
		return nil, nil
	}
	q := fmt.Sprintf("'%s' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'", id)
	res, err := s.driveSvc.Files.List().Q(q).SupportsAllDrives(true).IncludeItemsFromAllDrives(true).Fields("files(id, name, webViewLink)").Do()
	if err != nil {
		return nil, err
	}
	var fis []FileInfo
	for _, f := range res.Files {
		fis = append(fis, FileInfo{ID: f.Id, Name: f.Name, Link: f.WebViewLink})
	}
	return fis, nil
}

func (s *service) DeleteFile(ctx context.Context, id string) error {
	return s.driveSvc.Files.Delete(id).SupportsAllDrives(true).Do()
}
