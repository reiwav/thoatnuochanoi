package filters

import (
	"ai-api-tnhn/internal/base/mgo/filter"

	"go.mongodb.org/mongo-driver/bson"
)

type PumpingStationHistoryRequest struct {
	filter.PaginationFilter
	StationID string `json:"station_id" form:"station_id"`
	FromTime  int64  `json:"from_time" form:"from_time"`
	ToTime    int64  `json:"to_time" form:"to_time"`
}

func NewPumpingStationHistoryRequest() *PumpingStationHistoryRequest {
	req := &PumpingStationHistoryRequest{
		PaginationFilter: *filter.NewPaginationFilter(),
	}
	req.SetOrderBy("-priority")
	return req
}

func (f *PumpingStationHistoryRequest) GetWhere() filter.Where {
	if f.StationID != "" {
		f.AddWhere("station_id", "station_id", f.StationID)
	}
	if f.FromTime > 0 {
		f.AddWhere("from_time", "timestamp", bson.M{"$gte": f.FromTime})
	}
	if f.ToTime > 0 {
		f.AddWhere("to_time", "timestamp", bson.M{"$lte": f.ToTime})
	}

	return f.BasicFilter.GetWhere()
}
