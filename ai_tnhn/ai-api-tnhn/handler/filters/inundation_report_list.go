package filters

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type InundationReportListRequest struct {
	filter.PaginationFilter
	OrgID         string `form:"org_id"`
	Status        string `form:"status"`
	TrafficStatus string `form:"traffic_status"`
	Query         string `form:"query"`
}

func (f *InundationReportListRequest) GetWhere() filter.Where {
	if f.Status != "" {
		f.AddWhere("status", "status", f.Status)
	}
	if f.TrafficStatus != "" {
		f.AddWhere("traffic_status", "traffic_status", f.TrafficStatus)
	}
	if f.Query != "" {
		f.AddWhere("street_name", "street_name", primitive.M{"$regex": f.Query, "$options": "i"})
	}
	return f.BasicFilter.GetWhere()
}

func NewInundationReportListRequest() *InundationReportListRequest {
	req := &InundationReportListRequest{
		PaginationFilter: *filter.NewPaginationFilter(),
	}
	req.SetOrderBy("-created_at")
	return req
}
