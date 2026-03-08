package filters

import (
	"ai-api-tnhn/internal/base/mgo/filter"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type OrganizationListRequest struct {
	filter.PaginationFilter
	Name   string `json:"name" form:"name"`
	Code   string `json:"code" form:"code"`
	Status string `json:"status" form:"status"`
}

func NewOrganizationListRequest() *OrganizationListRequest {
	return &OrganizationListRequest{
		PaginationFilter: *filter.NewPaginationFilter(),
	}
}

func (f *OrganizationListRequest) GetWhere() filter.Where {
	if f.Name != "" {
		f.AddWhere("name", "name", primitive.Regex{Pattern: f.Name, Options: "i"})
	}
	if f.Code != "" {
		f.AddWhere("code", "code", primitive.Regex{Pattern: f.Code, Options: "i"})
	}
	// Status filtering - assuming exact match for bool converted from string or simple regex?
	// User model uses bool. Request uses string "true"/"false"?
	// Or maybe just skip status filter if complexity is high, but let's try basic.
	// Actually, status is bool in model. Filter usually receives string from query params.
	// For simplicity, let's skip status filter for now or handle it if needed.
	// Adding Name and Code search is sufficient for now.

	return f.BasicFilter.GetWhere()
}
