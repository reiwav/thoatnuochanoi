package filter

import (
	"go.mongodb.org/mongo-driver/bson"
)

// swagger:parameters basicOrder
type BasicOrder struct {
	// Field which you want to order by
	OrderBy []string `json:"order_by" form:"order_by"`
}

func NewBasicOrder() *BasicOrder {
	return &BasicOrder{}
}

func (s *BasicOrder) GetOrderBy() bson.D {
	sort := bson.D{}
	for _, val := range s.OrderBy {
		var subStr = val[0:1]
		var iSort = 1
		if subStr == "-" {
			iSort = -1
			val = val[1:]
		}
		sort = append(sort, bson.E{val, iSort})
	}
	return sort
}
