package storage

import (
	"context"
	"io"
)

type Service interface {
	UploadFile(ctx context.Context, folderID, name, mimeType string, content io.Reader, convert bool) (string, error)
	CreateFolder(ctx context.Context, parentID, name string) (string, error)
}
