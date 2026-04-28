package models

import (
	"ai-api-tnhn/internal/base/model"
)

type SluiceGate struct {
	model.BaseModel `bson:",inline"`
	Name            string   `bson:"name" json:"name" example:"Cửa phai A"`
	Address         string   `bson:"address" json:"address" example:"Số 1, đường X"`
	OrgID           string   `bson:"org_id" json:"org_id" example:"tnhn"`
	SharedOrgIDs    []string `bson:"shared_org_ids" json:"shared_org_ids"`
	ShareAll        bool     `bson:"share_all" json:"share_all"`
	Priority        int      `bson:"priority" json:"priority" example:"1"`
	Active          bool     `bson:"active" json:"active" example:"true"`
}

type SluiceGateHistory struct {
	model.BaseModel `bson:",inline"`
	SluiceGateID    string `bson:"sluice_gate_id" json:"sluice_gate_id"`
	UserID          string `bson:"user_id" json:"user_id"`
	Username        string `bson:"username" json:"username"`
	Fullname        string `bson:"fullname" json:"fullname"`
	Action          string `bson:"action" json:"action" example:"open"` // open, close, maintain
	Note            string `bson:"note" json:"note"`
}
