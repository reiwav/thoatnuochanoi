package filters

import (
	"ai-api-tnhn/internal/base/mgo/filter"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type InundationReportListRequest struct {
	filter.PaginationFilter
	Query         string `form:"query"`
	Status        string `form:"status"`
	TrafficStatus string `form:"traffic_status"`
	OrgID         string `form:"org_id"`
}

func (f *InundationReportListRequest) GetWhere() filter.Where {
	if f.Query != "" {
		f.AddWhere("name", "name", primitive.Regex{Pattern: f.Query, Options: "i"})
	}
	if f.Status != "" {
		if f.Status == "active" {
			f.AddWhere("report_id", "report_id", bson.M{"$eq": ""})
		} else {
			f.AddWhere("report_id", "report_id", bson.M{"$ne": ""})
		}
	}
	if f.TrafficStatus != "" {
		f.AddWhere("traffic_status", "traffic_status", f.TrafficStatus)
	}
	if f.OrgID != "" {
		f.AddWhere("org_id", "org_id", f.OrgID)
	}
	return f.BasicFilter.GetWhere()
}

func NewInundationReportListRequest() *InundationReportListRequest {
	req := &InundationReportListRequest{
		PaginationFilter: *filter.NewPaginationFilter(),
	}
	req.SetOrderBy("-start_time")
	return req
}
