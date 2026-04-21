package inundation

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
)

func (s *service) GetOrgByCode(ctx context.Context, code string) (*models.Organization, error) {
	return s.orgRepo.GetByCode(ctx, code)
}
func (s *service) GetOrgByID(ctx context.Context, id string) (*models.Organization, error) {
	return s.orgRepo.GetByID(ctx, id)
}
func (s *service) ListOrganizations(ctx context.Context) ([]*models.Organization, error) {
	f := filter.NewPaginationFilter()
	f.PerPage = 1000
	orgs, _, err := s.orgRepo.List(ctx, f)
	return orgs, err
}
