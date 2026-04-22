package googleapi

import (
	"ai-api-tnhn/internal/service/inundation"
	"context"
)

func (s *service) GetInundationSummary(ctx context.Context, orgID string, isAllowedAll bool, assignedInuIDs []string) (*inundation.InundationSummaryData, error) {
	return s.inuSvc.GetInundationSummary(ctx, orgID, isAllowedAll, assignedInuIDs)
}
