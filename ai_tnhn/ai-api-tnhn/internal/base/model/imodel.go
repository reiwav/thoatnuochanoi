package model

import (
	"fmt"
	"time"

	"github.com/rs/xid"
)

type IModel interface {
	BeforeCreate(prefix string)
	BeforeUpdate()
	BeforeDelete()
	GetID() string
}

type BaseModel struct {
	ID    string `json:"id" bson:"_id"`
	CTime int64  `json:"created_at" bson:"created_at"`
	MTime int64  `json:"updated_at" bson:"updated_at"`
	DTime int64  `json:"deleted_at" bson:"deleted_at"`
}

func (m *BaseModel) BeforeCreate(prefix string) {
	now := time.Now().Unix()
	m.CTime = now
	m.MTime = now
	m.ID = prefix + "_" + xid.New().String()
	fmt.Println(m)
}

func (m *BaseModel) BeforeUpdate() {
	now := time.Now().Unix()
	m.MTime = now
}

func (m *BaseModel) BeforeDelete() {
	now := time.Now().Unix()
	m.DTime = now
}

func (m *BaseModel) GetID() string {
	return m.ID
}
