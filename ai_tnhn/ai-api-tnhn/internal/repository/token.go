package repository

import (
	"ai-api-tnhn/internal/base/mgo"
	"ai-api-tnhn/internal/models"
	"context"
)

type Token interface {
	mgo.BaseTable
	GetByID(ctx context.Context, id string) (*models.Token, error)
}
