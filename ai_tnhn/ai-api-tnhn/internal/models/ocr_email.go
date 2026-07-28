package models

import "ai-api-tnhn/internal/base/model"

type OCREmailRecord struct {
	model.BaseModel `bson:",inline"`
	EmailID         uint32 `json:"email_id" bson:"email_id"`
	OCRText         string `json:"ocr_text" bson:"ocr_text"`
}
