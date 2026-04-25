package filters

import (
	"ai-api-tnhn/internal/base/mgo/filter"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type InundationReportListRequest struct {
	filter.PaginationFilter
	OrgID         string `form:"org_id"`
	PointID       string `form:"point_id"`
	Status        string `form:"status"`
	TrafficStatus string `form:"traffic_status"`
	Query         string `form:"query"`
	FromTime      int64  `form:"from_time"`
	ToTime        int64  `form:"to_time"`
	IsFlooding    *bool  `form:"is_flooding"`
}

func (f *InundationReportListRequest) GetWhere() filter.Where {
	if f.Status != "" {
		f.AddWhere("status", "status", f.Status)
	}
	if f.PointID != "" {
		f.AddWhere("point_id", "point_id", f.PointID)
	}
	if f.TrafficStatus != "" {
		f.AddWhere("traffic_status", "traffic_status", f.TrafficStatus)
	}
	if f.Query != "" {
		f.AddWhere("street_name", "street_name", primitive.M{"$regex": f.Query, "$options": "i"})
	}
	if f.FromTime > 0 {
		f.AddWhere("time_gt", "start_time", primitive.M{"$gte": f.FromTime})
	}
	if f.ToTime > 0 {
		f.AddWhere("time_lt", "start_time", primitive.M{"$lte": f.ToTime})
	}
	if f.IsFlooding != nil {
		f.AddWhere("is_flooding", "is_flooding", f.IsFlooding)
	}
	return f.BasicFilter.GetWhere()
}

func NewInundationReportListRequest() *InundationReportListRequest {
	req := &InundationReportListRequest{
		PaginationFilter: *filter.NewPaginationFilter(),
	}
	req.SetOrderBy("name")
	return req
}
