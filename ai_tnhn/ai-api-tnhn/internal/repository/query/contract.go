package query

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/base/mgo/db"
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"

	"go.mongodb.org/mongo-driver/mongo"
)

type contractRepo struct {
	*db.Table
}

func NewContractRepository(dbase *mongo.Database, collectionName string, prefix string, l logger.Logger) repository.Contract {
	return &contractRepo{
		Table: db.NewTable(collectionName, prefix, dbase, l),
	}
}

func (r *contractRepo) Upsert(ctx context.Context, contract *models.Contract) error {
	if contract.ID == "" {
		return r.R_Create(ctx, contract)
	}
	return r.R_Update(ctx, contract)
}

func (r *contractRepo) Delete(ctx context.Context, id string) error {
	return r.R_DeleteByID(ctx, id)
}

func (r *contractRepo) GetByID(ctx context.Context, id string) (*models.Contract, error) {
	var contract models.Contract
	err := r.R_SelectByID(ctx, id, &contract)
	return &contract, err
}

func (r *contractRepo) List(ctx context.Context, f filter.Filter) ([]*models.Contract, int64, error) {
	var contracts []*models.Contract
	total, err := r.R_SearchAndCount(ctx, f, &contracts)
	return contracts, total, err
}
