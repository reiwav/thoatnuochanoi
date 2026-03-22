package query

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/base/mgo/db"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"

	"go.mongodb.org/mongo-driver/mongo"
)

type tokenRepository struct {
	*db.Table
}

func NewTokenRepo(dbc *mongo.Database, name, prefix string, l logger.Logger) repository.Token {
	return tokenRepository{db.NewTable(name, prefix, dbc, l)}
}

func (p tokenRepository) GetByID(ctx context.Context, id string) (*models.Token, error) {
	var m *models.Token
	return m, p.R_SelectByID(ctx, id, &m)
}
