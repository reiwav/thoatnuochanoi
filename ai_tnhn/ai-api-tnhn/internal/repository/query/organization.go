package query

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/base/mgo/db"
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type orgRepo struct {
	*db.Table
}

func NewOrganizationRepository(dbase *mongo.Database, collectionName string, prefix string, l logger.Logger) repository.Organization {
	return &orgRepo{
		Table: db.NewTable(collectionName, prefix, dbase, l),
	}
}

func (r *orgRepo) Upsert(ctx context.Context, org *models.Organization) error {
	if org.ID == "" {
		return r.R_Create(ctx, org)
	}
	return r.R_Update(ctx, org)
}

func (r *orgRepo) Delete(ctx context.Context, id string) error {
	return r.R_DeleteByID(ctx, id)
}

func (r *orgRepo) GetByID(ctx context.Context, id string) (*models.Organization, error) {
	var org models.Organization
	err := r.R_SelectByID(ctx, id, &org)
	return &org, err
}

func (r *orgRepo) GetByCode(ctx context.Context, code string) (*models.Organization, error) {
	var org models.Organization
	filter := bson.M{"code": code}
	err := r.R_SelectOne(ctx, filter, &org)
	return &org, err
}

func (r *orgRepo) List(ctx context.Context, filter filter.Filter) ([]*models.Organization, int64, error) {
	var orgs []*models.Organization
	total, err := r.R_SearchAndCount(ctx, filter, &orgs)
	return orgs, total, err
}

func (r *orgRepo) UpdateDriveFolderID(ctx context.Context, id, folderID string) error {
	update := bson.M{"$set": bson.M{"drive_folder_id": folderID}}
	return r.R_UnsafeUpdateByID(ctx, id, update)
}
