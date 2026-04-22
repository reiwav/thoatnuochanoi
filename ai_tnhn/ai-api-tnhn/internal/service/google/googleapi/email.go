package googleapi

import (
	"ai-api-tnhn/internal/service/email"
	"context"
	"fmt"
)

func (s *service) GetRecentEmails(ctx context.Context, limit int) ([]email.EmailInfo, error) {
	if s.emailSvc == nil {
		return nil, fmt.Errorf("email service not initialized")
	}
	return s.emailSvc.GetRecentEmails(ctx, limit)
}

func (s *service) GetUnreadEmails(ctx context.Context, limit int) ([]email.EmailInfo, error) {
	if s.emailSvc == nil {
		return nil, fmt.Errorf("email service not initialized")
	}
	return s.emailSvc.GetUnreadEmails(ctx, limit)
}

func (s *service) ReadEmailByTitle(ctx context.Context, title string) (*email.EmailDetail, error) {
	if s.emailSvc == nil {
		return nil, fmt.Errorf("email service not initialized")
	}
	return s.emailSvc.ReadEmailByTitle(ctx, title)
}

func (s *service) ReadEmailByID(ctx context.Context, id uint32) (*email.EmailDetail, error) {
	if s.emailSvc == nil {
		return nil, fmt.Errorf("email service not initialized")
	}
	return s.emailSvc.ReadEmailByID(ctx, id)
}
