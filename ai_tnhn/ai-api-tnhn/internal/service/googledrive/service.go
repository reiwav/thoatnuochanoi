package googledrive

import (
	"ai-api-tnhn/config"
	"context"
	"encoding/json"
	"fmt"
	"io"

	"golang.org/x/oauth2"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/option"

	"github.com/go-resty/resty/v2"
)

type Service interface {
	CreateOrgFolder(ctx context.Context, orgName string) (string, error)
	InitOrgFolders(ctx context.Context, orgName string) (string, error)
	UploadFile(ctx context.Context, folderID, name, mimeType string, content io.Reader, convert bool) (string, error)
	FindOrCreateFolder(ctx context.Context, parentID, folderName string) (string, error)
	TriggerReportGeneration(ctx context.Context, webhookURL, templateFileID, targetFolderID string, payload map[string]interface{}) (string, error)
	CopyFile(ctx context.Context, fileID, parentID, newName string) (string, error)
}

var DefaultSubfolders = []string{"RAIN", "RIVER", "LAKE", "CAMERA", "FLOOD"}

type service struct {
	driveSvc  *drive.Service
	rootID    string
	workspace string
}

func NewService(conf config.GoogleDriveConfig, oauthConf config.OAuthConfig) (Service, error) {
	ctx := context.Background()
	var driveSvc *drive.Service
	var err error

	if conf.GoogleRefreshToken != "" {
		// Use User OAuth 2.0 Flow
		oauthConfig := &oauth2.Config{
			ClientID:     oauthConf.ClientID,
			ClientSecret: oauthConf.ClientSecret,
			Endpoint: oauth2.Endpoint{
				TokenURL: "https://oauth2.googleapis.com/token",
			},
			Scopes: []string{drive.DriveScope},
		}

		token := &oauth2.Token{
			RefreshToken: conf.GoogleRefreshToken,
		}

		client := oauthConfig.Client(ctx, token)
		driveSvc, err = drive.NewService(ctx, option.WithHTTPClient(client))
		if err != nil {
			return nil, fmt.Errorf("failed to create drive service with oauth2: %w", err)
		}
	} else {
		// Use Service Account Fallback
		if conf.Credentials == "" {
			return nil, fmt.Errorf("google drive credentials not found in environment and no refresh token provided")
		}
		driveSvc, err = drive.NewService(ctx, option.WithCredentialsJSON([]byte(conf.Credentials)))
		if err != nil {
			return nil, fmt.Errorf("failed to create drive service with service account: %w", err)
		}
	}

	return &service{
		driveSvc:  driveSvc,
		rootID:    conf.RootFolderID,
		workspace: conf.WorkspaceName,
	}, nil
}

func (s *service) CreateOrgFolder(ctx context.Context, orgName string) (string, error) {
	// 1. Ensure workspace folder exists or find it
	workspaceID, err := s.FindOrCreateFolder(ctx, s.rootID, s.workspace)
	if err != nil {
		return "", fmt.Errorf("failed to handle root workspace folder: %w", err)
	}

	// 2. Create Org folder under WORKSPACE-TNHN
	return s.FindOrCreateFolder(ctx, workspaceID, orgName)
}

func (s *service) InitOrgFolders(ctx context.Context, orgName string) (string, error) {
	orgFolderID, err := s.CreateOrgFolder(ctx, orgName)
	if err != nil {
		return "", fmt.Errorf("failed to create base org folder: %w", err)
	}

	for _, subfolder := range DefaultSubfolders {
		_, err := s.FindOrCreateFolder(ctx, orgFolderID, subfolder)
		if err != nil {
			fmt.Printf("Warning: failed to create subfolder %s for org %s: %v\n", subfolder, orgName, err)
		}
	}

	return orgFolderID, nil
}

func (s *service) FindOrCreateFolder(ctx context.Context, parentID, folderName string) (string, error) {
	// Sanitize parentID: treat "." or empty as no parent (root)
	if parentID == "." {
		parentID = ""
	}

	query := fmt.Sprintf("name = '%s' and mimeType = 'application/vnd.google-apps.folder' and trashed = false", folderName)
	if parentID != "" {
		query += fmt.Sprintf(" and '%s' in parents", parentID)
	}

	res, err := s.driveSvc.Files.List().Q(query).SupportsAllDrives(true).IncludeItemsFromAllDrives(true).Fields("files(id)").Do()
	if err != nil {
		return "", fmt.Errorf("failed to list folders: %w", err)
	}

	if len(res.Files) > 0 {
		return res.Files[0].Id, nil
	}

	// Create if not exists
	f := &drive.File{
		Name:     folderName,
		MimeType: "application/vnd.google-apps.folder",
	}
	if parentID != "" {
		f.Parents = []string{parentID}
	}

	file, err := s.driveSvc.Files.Create(f).SupportsAllDrives(true).Fields("id").Do()
	if err != nil {
		return "", fmt.Errorf("failed to create folder '%s': %w", folderName, err)
	}

	fmt.Printf("Created Google Drive folder: %s (ID: %s) under parent: %s\n", folderName, file.Id, parentID)
	return file.Id, nil
}

func (s *service) UploadFile(ctx context.Context, folderID, name, mimeType string, content io.Reader, convert bool) (string, error) {
	// Sanitize folderID
	if folderID == "." {
		folderID = ""
	}

	f := &drive.File{
		Name: name,
	}
	if convert {
		f.MimeType = "application/vnd.google-apps.document"
	}

	if folderID != "" {
		f.Parents = []string{folderID}
	}

	file, err := s.driveSvc.Files.Create(f).Media(content).SupportsAllDrives(true).Fields("id").Do()
	if err != nil {
		return "", fmt.Errorf("failed to upload file: %w", err)
	}

	// Grant public read permission to the file so the frontend can view it
	permission := &drive.Permission{
		Type: "anyone",
		Role: "reader",
	}
	_, err = s.driveSvc.Permissions.Create(file.Id, permission).SupportsAllDrives(true).Do()
	if err != nil {
		fmt.Printf("Warning: failed to make uploaded file %s public: %v\n", file.Id, err)
	}

	return file.Id, nil
}

// TriggerReportGeneration sends a POST request to the Apps Script Webhook with the template ID, folder ID, and data payload.
func (s *service) TriggerReportGeneration(ctx context.Context, webhookURL, templateFileID, targetFolderID string, payload map[string]interface{}) (string, error) {
	if webhookURL == "" {
		return "", fmt.Errorf("webhook URL is empty")
	}

	// Construct the final request body
	requestBody := make(map[string]interface{})
	for k, v := range payload {
		requestBody[k] = v
	}
	requestBody["docID"] = templateFileID
	requestBody["folderId"] = targetFolderID

	// Log the final payload being sent to Apps Script
	payloadJson, _ := json.MarshalIndent(requestBody, "", "  ")
	fmt.Printf(">>> TriggerReportGeneration FINAL PAYLOAD to %s:\n%s\n", webhookURL, string(payloadJson))

	client := resty.New()
	// Apps Script redirects are common
	client.SetRedirectPolicy(resty.FlexibleRedirectPolicy(10))

	resp, err := client.R().
		SetContext(ctx).
		SetHeader("Content-Type", "application/json").
		SetBody(requestBody).
		Post(webhookURL)

	if err != nil {
		return "", fmt.Errorf("failed to call webhook: %w", err)
	}

	if resp.IsError() {
		return "", fmt.Errorf("webhook returned error status: %d - %s", resp.StatusCode(), resp.String())
	}

	// Try to parse JSON response looking for a URL
	var result struct {
		ReportURL string `json:"report_url"`
		URL       string `json:"url"`    // fallback
		Result    string `json:"result"` // another fallback
	}

	if err := json.Unmarshal(resp.Body(), &result); err == nil {
		if result.ReportURL != "" {
			return result.ReportURL, nil
		}
		if result.URL != "" {
			return result.URL, nil
		}
		if result.Result != "" {
			return result.Result, nil
		}
	}

	// If it's not JSON or doesn't have the expected fields, just return the raw string content if it looks like a URL
	return resp.String(), nil
}

func (s *service) CopyFile(ctx context.Context, fileID, parentID, newName string) (string, error) {
	if fileID == "" {
		return "", fmt.Errorf("fileID is empty")
	}

	f := &drive.File{
		Name: newName,
	}
	if parentID != "" {
		f.Parents = []string{parentID}
	}

	file, err := s.driveSvc.Files.Copy(fileID, f).SupportsAllDrives(true).Fields("id").Do()
	if err != nil {
		return "", fmt.Errorf("failed to copy file: %w", err)
	}

	// Grant public read permission
	permission := &drive.Permission{
		Type: "anyone",
		Role: "reader",
	}
	_, err = s.driveSvc.Permissions.Create(file.Id, permission).SupportsAllDrives(true).Do()
	if err != nil {
		fmt.Printf("Warning: failed to make copied file %s public: %v\n", file.Id, err)
	}

	return file.Id, nil
}
