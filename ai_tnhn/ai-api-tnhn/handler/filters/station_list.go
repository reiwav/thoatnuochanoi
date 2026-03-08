package filters

import (
	"ai-api-tnhn/internal/base/mgo/filter"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type StationListRequest struct {
	filter.PaginationFilter
	Search string `form:"search"`
	Active string `form:"active"`
}

func (f *StationListRequest) GetWhere() filter.Where {
	if f.Search != "" {
		f.AddWhere("ten_tram", "ten_tram", primitive.Regex{Pattern: f.Search, Options: "i"})
	}
	if f.Active != "" {
		active := f.Active == "true"
		f.AddWhere("active", "active", active)
	}
	return f.BasicFilter.GetWhere()
}

func NewStationListRequest() *StationListRequest {
	return &StationListRequest{
		PaginationFilter: *filter.NewPaginationFilter(),
	}
}
