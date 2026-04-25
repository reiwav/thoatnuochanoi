package filter

import (
	"strings"

	"go.mongodb.org/mongo-driver/bson"
)

type BasicFilter struct {
	where  Where
	joins  Joins
	keys   map[string]bool
	groups Groups
	order  *BasicOrder
}

func NewBasicFilter() *BasicFilter {
	return &BasicFilter{
		where:  Where{},
		joins:  Joins{},
		keys:   Keys{},
		groups: Groups{},
		order:  NewBasicOrder(),
	}
}

func (f *BasicFilter) GetOrderBy() bson.D {
	if f.order == nil {
		return bson.D{}
	}
	return f.order.GetOrderBy()
}

func (f *BasicFilter) SetOrderBy(orderBy ...string) *BasicFilter {
	if f.order == nil {
		f.order = NewBasicOrder()
	}
	f.order.OrderBy = orderBy
	return f
}

func (f *BasicFilter) AddSort(field string, order int) *BasicFilter {
	if f.order == nil {
		f.order = NewBasicOrder()
	}
	val := field
	if order == -1 {
		val = "-" + field
	}
	f.order.OrderBy = append(f.order.OrderBy, val)
	return f
}

// implement repository.Filter interface
func (f *BasicFilter) GetLimit() int64 {
	return IgnoreLimit
}

// implement repository.Filter interface
func (f *BasicFilter) GetOffset() int64 {
	return IgnoreOffset
}

// implement repository.Filter interface
func (f *BasicFilter) GetWhere() Where {
	return f.where
}

// GetJoins implement repository.Filter interface
func (f *BasicFilter) GetJoins() Joins {
	return f.joins
}

func (f *BasicFilter) AddWhere(key string, query string, values interface{}) *BasicFilter { //values ...interface{}) *BasicFilter {
	f.where[query] = values
	f.keys[key] = true
	return f
}

func (f *BasicFilter) AddJoin(join string, values interface{}) *BasicFilter { // ...interface{}) *BasicFilter {
	f.joins[join] = values
	return f
}

func (f *BasicFilter) AddKey(key string) *BasicFilter {
	f.keys[key] = true
	return f
}

func (f *BasicFilter) GetKeys() Keys {
	return f.keys
}

func (f *BasicFilter) AddGroup(query string) *BasicFilter {
	f.groups[query] = true
	return f
}
func (f *BasicFilter) GetGroups() string {
	var queries []string
	for query := range f.groups {
		queries = append(queries, query)
	}
	return strings.Join(queries, ",")
}
