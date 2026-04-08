package filters

import (
	"ai-api-tnhn/internal/base/mgo/filter"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type EmergencyConstructionListRequest struct {
	filter.PaginationFilter `form:",inline"`
	Name                    string `form:"name"`
	Status                  string `form:"status"`
	OrgID                   string `form:"org_id"`
}

func NewEmergencyConstructionListRequest() *EmergencyConstructionListRequest {
	return &EmergencyConstructionListRequest{
		PaginationFilter: *filter.NewPaginationFilter(),
	}
}

func (r *EmergencyConstructionListRequest) GetWhere() filter.Where {
	if r.Name != "" {
		r.AddWhere("name", "name", bson.M{"$regex": primitive.Regex{Pattern: r.Name, Options: "i"}})
	}
	if r.Status != "" {
		r.AddWhere("status", "status", r.Status)
	}
	if r.OrgID != "" {
		r.AddWhere("org_id", "org_id", r.OrgID)
	}
	return r.PaginationFilter.GetWhere()
}
