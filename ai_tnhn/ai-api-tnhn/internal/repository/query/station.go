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

// Rain Station Repository
type rainStationRepository struct {
	*db.Table
}

func NewRainStationRepo(dbc *mongo.Database, name, prefix string, l logger.Logger) repository.RainStation {
	return rainStationRepository{db.NewTable(name, prefix, dbc, l)}
}

func (p rainStationRepository) GetByID(ctx context.Context, id string) (*models.RainStation, error) {
	var m *models.RainStation
	return m, p.R_SelectByID(ctx, id, &m)
}

func (p rainStationRepository) Create(ctx context.Context, input *models.RainStation) (*models.RainStation, error) {
	return input, p.R_Create(ctx, input)
}

func (p rainStationRepository) Update(ctx context.Context, id string, input *models.RainStation) error {
	input.ID = id
	return p.R_Update(ctx, input)
}

func (p rainStationRepository) Delete(ctx context.Context, id string) error {
	return p.R_DeleteByID(ctx, id)
}

func (p rainStationRepository) List(ctx context.Context, filter filter.Filter) ([]*models.RainStation, int64, error) {
	var items []*models.RainStation
	total, err := p.R_SearchAndCount(ctx, filter, &items)
	return items, total, err
}

func (p rainStationRepository) ListFiltered(ctx context.Context, orgID string, ids []string) ([]*models.RainStation, error) {
	var items []*models.RainStation
	f := bson.M{}

	if orgID != "all" {
		var conds []bson.M
		if orgID != "" {
			conds = append(conds, bson.M{"org_id": orgID})
		}
		if len(ids) > 0 {
			conds = append(conds, bson.M{"_id": bson.M{"$in": ids}})
		}

		if len(conds) > 0 {
			f["$or"] = conds
		} else {
			return items, nil
		}
	}

	err := p.R_SelectMany(ctx, f, &items)
	return items, err
}

// Lake Station Repository
type lakeStationRepository struct {
	*db.Table
}

func NewLakeStationRepo(dbc *mongo.Database, name, prefix string, l logger.Logger) repository.LakeStation {
	return lakeStationRepository{db.NewTable(name, prefix, dbc, l)}
}

func (p lakeStationRepository) GetByID(ctx context.Context, id string) (*models.LakeStation, error) {
	var m *models.LakeStation
	return m, p.R_SelectByID(ctx, id, &m)
}

func (p lakeStationRepository) Create(ctx context.Context, input *models.LakeStation) (*models.LakeStation, error) {
	return input, p.R_Create(ctx, input)
}

func (p lakeStationRepository) Update(ctx context.Context, id string, input *models.LakeStation) error {
	input.ID = id
	return p.R_Update(ctx, input)
}

func (p lakeStationRepository) Delete(ctx context.Context, id string) error {
	return p.R_DeleteByID(ctx, id)
}

func (p lakeStationRepository) List(ctx context.Context, filter filter.Filter) ([]*models.LakeStation, int64, error) {
	var items []*models.LakeStation
	total, err := p.R_SearchAndCount(ctx, filter, &items)
	return items, total, err
}

func (p lakeStationRepository) ListFiltered(ctx context.Context, orgID string, ids []string) ([]*models.LakeStation, error) {
	var items []*models.LakeStation
	f := bson.M{}

	if orgID != "all" {
		var conds []bson.M
		if orgID != "" {
			conds = append(conds, bson.M{"org_id": orgID})
		}
		if len(ids) > 0 {
			conds = append(conds, bson.M{"_id": bson.M{"$in": ids}})
		}

		if len(conds) > 0 {
			f["$or"] = conds
		} else {
			return items, nil
		}
	}

	err := p.R_SelectMany(ctx, f, &items)
	return items, err
}

// River Station Repository
type riverStationRepository struct {
	*db.Table
}

func NewRiverStationRepo(dbc *mongo.Database, name, prefix string, l logger.Logger) repository.RiverStation {
	return riverStationRepository{db.NewTable(name, prefix, dbc, l)}
}

func (p riverStationRepository) GetByID(ctx context.Context, id string) (*models.RiverStation, error) {
	var m *models.RiverStation
	return m, p.R_SelectByID(ctx, id, &m)
}

func (p riverStationRepository) Create(ctx context.Context, input *models.RiverStation) (*models.RiverStation, error) {
	return input, p.R_Create(ctx, input)
}

func (p riverStationRepository) Update(ctx context.Context, id string, input *models.RiverStation) error {
	input.ID = id
	return p.R_Update(ctx, input)
}

func (p riverStationRepository) Delete(ctx context.Context, id string) error {
	return p.R_DeleteByID(ctx, id)
}

func (p riverStationRepository) List(ctx context.Context, filter filter.Filter) ([]*models.RiverStation, int64, error) {
	var items []*models.RiverStation
	total, err := p.R_SearchAndCount(ctx, filter, &items)
	return items, total, err
}

func (p riverStationRepository) ListFiltered(ctx context.Context, orgID string, ids []string) ([]*models.RiverStation, error) {
	var items []*models.RiverStation
	f := bson.M{}

	if orgID != "all" {
		var conds []bson.M
		if orgID != "" {
			conds = append(conds, bson.M{"org_id": orgID})
		}
		if len(ids) > 0 {
			conds = append(conds, bson.M{"_id": bson.M{"$in": ids}})
		}

		if len(conds) > 0 {
			f["$or"] = conds
		} else {
			return items, nil
		}
	}

	err := p.R_SelectMany(ctx, f, &items)
	return items, err
}
