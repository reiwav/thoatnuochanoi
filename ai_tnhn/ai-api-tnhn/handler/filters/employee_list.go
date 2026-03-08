package filters

import (
	"ai-api-tnhn/internal/base/mgo/filter"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type EmployeeListRequest struct {
	filter.PaginationFilter
	Name  string `json:"name" form:"name"`
	Email string `json:"email" form:"email"`
	OrgID string `json:"org_id" form:"org_id"` // Fill from context in handler
}

func NewEmployeeListRequest() *EmployeeListRequest {
	return &EmployeeListRequest{
		PaginationFilter: *filter.NewPaginationFilter(),
	}
}

func (f *EmployeeListRequest) GetWhere() filter.Where {
	// Always filter by Role = employee
	f.AddWhere("role", "role", "employee")

	if f.OrgID != "" && f.OrgID != "all" {
		f.AddWhere("org_id", "org_id", f.OrgID)
	}
	if f.Name != "" {
		f.AddWhere("name", "name", primitive.Regex{Pattern: f.Name, Options: "i"})
	}
	if f.Email != "" {
		f.AddWhere("email", "email", primitive.Regex{Pattern: f.Email, Options: "i"})
	}

	return f.BasicFilter.GetWhere()
}
