package googledrive

import (
	"ai-api-tnhn/config"
	"ai-api-tnhn/internal/service/storage"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"google.golang.org/api/drive/v3"
	"google.golang.org/api/option"
)

var DefaultSubfolders = []string{"QUYET-DINH", "HO-SO-PHAP-LY", "BAN-VE-THI-CONG", "HO-SO-CHAT-LUONG", "HO-SO-THANH-TOAN", "DINH-MUC-BO-DON-GIA"}

type FileInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Link string `json:"link,omitempty"`
}

type Service interface {
	UploadFile(ctx context.Context, folderID, name, mimeType string, content io.Reader, convert bool) (string, error)
	UploadFileSimple(ctx context.Context, folderID, name, mimeType string, content io.Reader) (string, error)
	CreateFolder(ctx context.Context, parentID, name string) (string, error)
	CreateOrgFolder(ctx context.Context, orgName string) (string, error)
	InitOrgFolders(ctx context.Context, orgName string) (string, error)
	FindOrCreateFolder(ctx context.Context, parentID, folderName string) (string, error)
	TriggerReportGeneration(ctx context.Context, webhookURL, templateFileID, targetFolderID string, payload map[string]interface{}) (string, error)
	CopyFile(ctx context.Context, fileID, parentID, newName string) (string, error)
	GetFileContent(ctx context.Context, fileID string) ([]byte, error)
	SetPublic(ctx context.Context, fileID string) error
	MoveFile(ctx context.Context, fileID, newParentID string) error
	GetFolderLink(ctx context.Context, folderID string) string
	ListFiles(ctx context.Context, folderID string) ([]FileInfo, error)
	DeleteFile(ctx context.Context, fileID string) error
}

type service struct {
	cfg      config.GoogleDriveConfig
	driveSvc *drive.Service
}

func NewService(conf config.GoogleDriveConfig, oauthConf config.OAuthConfig) (Service, error) {
	ctx := context.Background()
	driveSvc, err := drive.NewService(ctx, option.WithCredentialsJSON([]byte(conf.Credentials)))
	if err != nil { return nil, fmt.Errorf("failed to create drive service: %w", err) }
	return &service{cfg: conf, driveSvc: driveSvc}, nil
}

func (s *service) UploadFile(ctx context.Context, folderID, name, mimeType string, content io.Reader, convert bool) (string, error) {
	f := &drive.File{Name: name, Parents: []string{folderID}}
	if convert { f.MimeType = "application/vnd.google-apps.document" }
	res, err := s.driveSvc.Files.Create(f).Media(content).SupportsAllDrives(true).Do()
	if err != nil { return "", fmt.Errorf("failed to upload file: %w", err) }
	return res.Id, nil
}

func (s *service) UploadFileSimple(ctx context.Context, folderID, name, mimeType string, content io.Reader) (string, error) {
	return s.UploadFile(ctx, folderID, name, mimeType, content, false)
}

func (s *service) CreateFolder(ctx context.Context, parentID, name string) (string, error) {
	f := &drive.File{Name: name, MimeType: "application/vnd.google-apps.folder", Parents: []string{parentID}}
	res, err := s.driveSvc.Files.Create(f).SupportsAllDrives(true).Do()
	if err != nil { return "", fmt.Errorf("failed to create folder: %w", err) }
	return res.Id, nil
}

func (s *service) CreateOrgFolder(ctx context.Context, orgName string) (string, error) {
	return s.CreateFolder(ctx, s.cfg.RootFolderID, orgName)
}

func (s *service) InitOrgFolders(ctx context.Context, orgName string) (string, error) {
	orgID, err := s.CreateOrgFolder(ctx, orgName)
	if err != nil { return "", err }
	for _, sub := range DefaultSubfolders { s.CreateFolder(ctx, orgID, sub) }
	return orgID, nil
}

func (s *service) FindOrCreateFolder(ctx context.Context, parentID, folderName string) (string, error) {
	q := fmt.Sprintf("name = '%s' and mimeType = 'application/vnd.google-apps.folder' and '%s' in parents and trashed = false", folderName, parentID)
	res, err := s.driveSvc.Files.List().Q(q).SupportsAllDrives(true).IncludeItemsFromAllDrives(true).Do()
	if err == nil && len(res.Files) > 0 { return res.Files[0].Id, nil }
	return s.CreateFolder(ctx, parentID, folderName)
}

func (s *service) TriggerReportGeneration(ctx context.Context, webhookURL, templateID, targetID string, payload map[string]interface{}) (string, error) {
	data := map[string]interface{}{"templateFileId": templateID, "targetFolderId": targetID, "data": payload}
	jsonBody, _ := json.Marshal(data)
	req, _ := http.NewRequestWithContext(ctx, "POST", webhookURL, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil { return "", err }
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return string(body), nil
}

func (s *service) CopyFile(ctx context.Context, fileID, parentID, newName string) (string, error) {
	f, err := s.driveSvc.Files.Copy(fileID, &drive.File{Name: newName, Parents: []string{parentID}}).SupportsAllDrives(true).Do()
	if err != nil { return "", err }
	s.SetPublic(ctx, f.Id)
	return f.Id, nil
}

func (s *service) GetFileContent(ctx context.Context, id string) ([]byte, error) {
	resp, err := s.driveSvc.Files.Get(id).Download()
	if err != nil { return nil, err }
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

func (s *service) SetPublic(ctx context.Context, id string) error {
	_, err := s.driveSvc.Permissions.Create(id, &drive.Permission{Type: "anyone", Role: "reader"}).SupportsAllDrives(true).Do()
	return err
}

func (s *service) MoveFile(ctx context.Context, id, parentID string) error {
	f, err := s.driveSvc.Files.Get(id).Fields("parents").Do()
	if err != nil { return err }
	_, err = s.driveSvc.Files.Update(id, nil).AddParents(parentID).RemoveParents(strings.Join(f.Parents, ",")).SupportsAllDrives(true).Do()
	return err
}

func (s *service) GetFolderLink(ctx context.Context, id string) string { return fmt.Sprintf("https://drive.google.com/drive/folders/%s", id) }

func (s *service) ListFiles(ctx context.Context, id string) ([]FileInfo, error) {
	if id == "" || id == "." { return nil, nil }
	q := fmt.Sprintf("'%s' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'", id)
	res, err := s.driveSvc.Files.List().Q(q).SupportsAllDrives(true).IncludeItemsFromAllDrives(true).Fields("files(id, name, webViewLink)").Do()
	if err != nil { return nil, err }
	var fis []FileInfo
	for _, f := range res.Files { fis = append(fis, FileInfo{ID: f.Id, Name: f.Name, Link: f.WebViewLink}) }
	return fis, nil
}

func (s *service) DeleteFile(ctx context.Context, id string) error { return s.driveSvc.Files.Delete(id).SupportsAllDrives(true).Do() }

// ----------------------------------------------------------------------------
// Storage Wrapper
// ----------------------------------------------------------------------------

type storageWrapper struct {
	storageSvc storage.Service
	driveSvc   Service
}

func NewStorageWrapper(storageSvc storage.Service, driveSvc Service) Service {
	return &storageWrapper{storageSvc: storageSvc, driveSvc: driveSvc}
}

func (w *storageWrapper) UploadFile(ctx context.Context, fID, n, m string, c io.Reader, conv bool) (string, error) {
	if w.driveSvc != nil { return w.driveSvc.UploadFile(ctx, fID, n, m, c, conv) }
	return w.storageSvc.UploadFile(ctx, fID, n, m, c, conv)
}
func (w *storageWrapper) UploadFileSimple(ctx context.Context, fID, n, m string, c io.Reader) (string, error) {
	if w.driveSvc != nil { return w.driveSvc.UploadFileSimple(ctx, fID, n, m, c) }
	return w.storageSvc.UploadFileSimple(ctx, fID, n, m, c)
}
func (w *storageWrapper) CreateFolder(ctx context.Context, pID, n string) (string, error) {
	if w.driveSvc != nil { return w.driveSvc.CreateFolder(ctx, pID, n) }
	return w.storageSvc.CreateFolder(ctx, pID, n)
}
func (w *storageWrapper) CreateOrgFolder(ctx context.Context, n string) (string, error) {
	if w.driveSvc != nil { return w.driveSvc.CreateOrgFolder(ctx, n) }
	return w.storageSvc.CreateFolder(ctx, ".", n)
}
func (w *storageWrapper) InitOrgFolders(ctx context.Context, n string) (string, error) {
	var dID string
	if w.driveSvc != nil { dID, _ = w.driveSvc.InitOrgFolders(ctx, n) }
	oID, _ := w.storageSvc.CreateFolder(ctx, ".", n)
	for _, sub := range DefaultSubfolders { w.storageSvc.CreateFolder(ctx, oID, sub) }
	if w.driveSvc != nil { return dID, nil }
	return oID, nil
}
func (w *storageWrapper) FindOrCreateFolder(ctx context.Context, pID, n string) (string, error) {
	if w.driveSvc != nil { return w.driveSvc.FindOrCreateFolder(ctx, pID, n) }
	return w.storageSvc.CreateFolder(ctx, pID, n)
}
func (w *storageWrapper) TriggerReportGeneration(ctx context.Context, wh, tID, tgID string, p map[string]interface{}) (string, error) {
	if w.driveSvc == nil { return "", fmt.Errorf("drive required") }
	return w.driveSvc.TriggerReportGeneration(ctx, wh, tID, tgID, p)
}
func (w *storageWrapper) CopyFile(ctx context.Context, fID, pID, n string) (string, error) {
	if w.driveSvc == nil { return "", fmt.Errorf("drive required") }
	return w.driveSvc.CopyFile(ctx, fID, pID, n)
}
func (w *storageWrapper) MoveFile(ctx context.Context, id, pID string) error {
	if w.driveSvc == nil { return fmt.Errorf("drive required") }
	return w.driveSvc.MoveFile(ctx, id, pID)
}
func (w *storageWrapper) GetFileContent(ctx context.Context, id string) ([]byte, error) {
	id = strings.TrimSpace(id)
	if strings.HasPrefix(id, "/api/storage/file/") { return w.storageSvc.GetFileContent(ctx, id) }
	if w.driveSvc == nil { return nil, fmt.Errorf("drive required") }
	return w.driveSvc.GetFileContent(ctx, id)
}
func (w *storageWrapper) SetPublic(ctx context.Context, id string) error {
	if w.driveSvc != nil { return w.driveSvc.SetPublic(ctx, id) }
	return w.storageSvc.SetPublic(ctx, id)
}
func (w *storageWrapper) GetFolderLink(ctx context.Context, id string) string {
	if w.driveSvc != nil { return w.driveSvc.GetFolderLink(ctx, id) }
	return ""
}
func (w *storageWrapper) ListFiles(ctx context.Context, id string) ([]FileInfo, error) {
	if w.driveSvc != nil { return w.driveSvc.ListFiles(ctx, id) }
	return nil, nil
}
func (w *storageWrapper) DeleteFile(ctx context.Context, id string) error {
	if w.driveSvc != nil { return w.driveSvc.DeleteFile(ctx, id) }
	return fmt.Errorf("drive required")
}
