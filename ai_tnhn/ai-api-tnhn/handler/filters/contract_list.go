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
	ParentID   string `json:"parent_id" form:"parent_id"`
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

	var conditions []primitive.M

	if f.OrgID != "" {
		conditions = append(conditions, primitive.M{
			"$or": []primitive.M{
				{"org_id": f.OrgID},
				{"org_id": ""},
				{"org_id": primitive.Null{}},
			},
		})
	}

	if f.Name != "" {
		pattern := primitive.M{
			"$regex":   f.Name,
			"$options": "i",
		}
		conditions = append(conditions, primitive.M{
			"$or": []primitive.M{
				{"name": pattern},
				{"contract_number": pattern},
				{"investor_name": pattern},
				{"jv_members": pattern},
			},
		})
	}

	if len(conditions) > 0 {
		where["$and"] = conditions
	}

	if f.CategoryID != "" {
		where["category_id"] = f.CategoryID
	}

	if f.ParentID != "" {
		where["parent_id"] = f.ParentID
	}

	return where
}
