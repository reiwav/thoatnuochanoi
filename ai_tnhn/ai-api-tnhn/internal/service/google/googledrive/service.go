package googledrive

import (
	"ai-api-tnhn/config"
	"context"
	"io"

	"google.golang.org/api/drive/v3"
	"google.golang.org/api/option"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"fmt"
	"strings"
)

var DefaultSubfolders = []string{"QUYET-DINH", "HO-SO-PHAP-LY", "BAN-VE-THI-CONG", "HO-SO-CHAT-LUONG", "HO-SO-THANH-TOAN", "DINH-MUC-BO-DON-GIA"}

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
	var opts []option.ClientOption

	// Priority 1: Service Account JSON
	if strings.Contains(conf.Credentials, "\"type\":\"service_account\"") {
		opts = append(opts, option.WithAuthCredentialsJSON(option.ServiceAccount, []byte(conf.Credentials)))
	} else if conf.GoogleRefreshToken != "" && oauthConf.ClientID != "" && oauthConf.ClientSecret != "" {
		// Priority 2: OAuth2 Refresh Token
		oCfg := &oauth2.Config{
			ClientID:     oauthConf.ClientID,
			ClientSecret: oauthConf.ClientSecret,
			Endpoint:     google.Endpoint,
			Scopes:       []string{drive.DriveScope},
		}
		token := &oauth2.Token{
			RefreshToken: conf.GoogleRefreshToken,
		}
		client := oCfg.Client(ctx, token)
		opts = append(opts, option.WithHTTPClient(client))
	} else {
		// Priority 3: Fallback (use AuthCredentialsJSON if possible, else original)
		opts = append(opts, option.WithAuthCredentialsJSON(option.ServiceAccount, []byte(conf.Credentials)))
	}

	driveSvc, err := drive.NewService(ctx, opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to create drive service: %w", err)
	}
	return &service{cfg: conf, driveSvc: driveSvc}, nil
}
