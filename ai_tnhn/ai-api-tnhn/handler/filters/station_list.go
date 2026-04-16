package filters

import (
	"ai-api-tnhn/internal/base/mgo/filter"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type StationListRequest struct {
	filter.PaginationFilter
	Search string `form:"search"`
	Active string `form:"active"`
	Loai   string `form:"loai"`
}

func (f *StationListRequest) GetWhere() filter.Where {
	if f.Search != "" {
		f.AddWhere("ten_tram", "ten_tram", primitive.Regex{Pattern: f.Search, Options: "i"})
	}
	if f.Active != "" {
		active := f.Active == "true"
		f.AddWhere("active", "active", active)
	}
	if f.Loai != "" {
		f.AddWhere("loai", "loai", f.Loai)
	}
	return f.BasicFilter.GetWhere()
}

func NewStationListRequest() *StationListRequest {
	req := &StationListRequest{
		PaginationFilter: *filter.NewPaginationFilter(),
	}
	req.SetOrderBy("ten_tram")
	return req
}
