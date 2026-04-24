package filters

import (
	"ai-api-tnhn/internal/base/mgo/filter"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ContractListRequest struct {
	filter.PaginationFilter
	Name       string `json:"name" form:"name"`
	CategoryID string `json:"category_id" form:"category_id"`
	OrgID      string `json:"org_id" form:"org_id"`
}

func NewContractListRequest() *ContractListRequest {
	return &ContractListRequest{
		PaginationFilter: *filter.NewPaginationFilter(),
	}
}

func (f *ContractListRequest) GetWhere() filter.Where {
	where := f.BasicFilter.GetWhere()
	if where == nil {
		where = make(filter.Where)
	}

	if f.OrgID != "" {
		where["$or"] = []primitive.M{
			{"org_id": f.OrgID},
			{"org_id": ""},
			{"org_id": primitive.Null{}},
		}
	}

	if f.Name != "" {
		where["name"] = primitive.M{
			"$regex":   f.Name,
			"$options": "i",
		}
	}

	if f.CategoryID != "" {
		where["category_id"] = f.CategoryID
	}

	return where
}
