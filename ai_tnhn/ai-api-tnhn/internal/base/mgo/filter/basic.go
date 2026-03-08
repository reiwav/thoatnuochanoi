package filter

import (
	"go.mongodb.org/mongo-driver/bson"
)

const (
	IgnoreLimit  = -1
	IgnoreOffset = -1
)

type Where bson.M
type Joins bson.M
type Keys map[string]bool
type Groups map[string]bool
type Filter interface {
	GetWhere() Where
	GetJoins() Joins
	GetLimit() int64
	GetOffset() int64
	GetOrderBy() bson.D
	GetKeys() Keys
	GetGroups() string
	AddWhere(key string, query string, values interface{}) *BasicFilter
}
