package email

import (
	"ai-api-tnhn/config"
	"context"
)

type Service interface {
	GetLatestRainWarning(ctx context.Context) (string, error)
	GetUnreadCount(ctx context.Context) (int, error)
	GetRecentEmails(ctx context.Context, limit int) ([]EmailInfo, error)
	GetUnreadEmails(ctx context.Context, limit int) ([]EmailInfo, error)
	ReadEmailByTitle(ctx context.Context, title string) (*EmailDetail, error)
	ReadEmailByID(ctx context.Context, id uint32) (*EmailDetail, error)
	GetLatestEmailByFilter(ctx context.Context) (*EmailInfo, error)
	GetLatestEmailAttachmentPage1(ctx context.Context) (string, error)
	GetLatestEmailAttachmentRaw(ctx context.Context) ([]byte, string, error)
	GetLatestWeatherEmailID(ctx context.Context) (uint32, error)
	GetEmailAttachmentRawByID(ctx context.Context, id uint32) ([]byte, string, error)
	DownloadAttachment(ctx context.Context, emailID uint32, attachmentID uint32) ([]byte, error)
}

type service struct {
	conf config.EmailConfig
}

func NewService(conf config.EmailConfig) Service {
	return &service{conf: conf}
}
