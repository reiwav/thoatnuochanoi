package query

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/base/mgo/db"
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/base/model"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type wastewaterStationRepository struct {
	stationTable *db.Table
	reportTable  *db.Table
}

func NewWastewaterStationRepo(dbc *mongo.Database, l logger.Logger) repository.WastewaterStation {
	return wastewaterStationRepository{
		stationTable: db.NewTable("wastewater_stations", "ws", dbc, l),
		reportTable:  db.NewTable("wastewater_station_reports", "wsr", dbc, l),
	}
}

// Proxies for mgo.BaseTable
func (r wastewaterStationRepository) GetCollection() *mongo.Collection { return r.stationTable.GetCollection() }
func (r wastewaterStationRepository) R_Search(ctx context.Context, f filter.Filter, val interface{}) error {
	return r.stationTable.R_Search(ctx, f, val)
}
func (r wastewaterStationRepository) R_SearchAndCount(ctx context.Context, f filter.Filter, val interface{}) (int64, error) {
	return r.stationTable.R_SearchAndCount(ctx, f, val)
}
func (r wastewaterStationRepository) R_CreateIndexOne(ctx context.Context, mode mongo.IndexModel, opts ...*options.CreateIndexesOptions) error {
	return r.stationTable.R_CreateIndexOne(ctx, mode, opts...)
}
func (r wastewaterStationRepository) R_CreateIndexMany(ctx context.Context, mods []mongo.IndexModel, opts ...*options.CreateIndexesOptions) error {
	return r.stationTable.R_CreateIndexMany(ctx, mods, opts...)
}
func (r wastewaterStationRepository) R_Create(ctx context.Context, m model.IModel) error {
	return r.stationTable.R_Create(ctx, m)
}
func (r wastewaterStationRepository) R_CreateForce(ctx context.Context, m model.IModel) error {
	return r.stationTable.R_CreateForce(ctx, m)
}
func (r wastewaterStationRepository) R_Update(ctx context.Context, m model.IModel) error {
	return r.stationTable.R_Update(ctx, m)
}
func (r wastewaterStationRepository) R_Delete(ctx context.Context, id string, m model.IModel) error {
	return r.stationTable.R_Delete(ctx, id, m)
}
func (r wastewaterStationRepository) R_DeleteByID(ctx context.Context, id string) error {
	return r.stationTable.R_DeleteByID(ctx, id)
}
func (r wastewaterStationRepository) R_SelectAndDelete(ctx context.Context, id string) error {
	return r.stationTable.R_SelectAndDelete(ctx, id)
}
func (r wastewaterStationRepository) R_UnsafeUpdate(ctx context.Context, f bson.M, v interface{}) error {
	return r.stationTable.R_UnsafeUpdate(ctx, f, v)
}
func (r wastewaterStationRepository) R_UpdateForce(ctx context.Context, f bson.M, v interface{}) error {
	return r.stationTable.R_UpdateForce(ctx, f, v)
}
func (r wastewaterStationRepository) R_UnsafeUpdateByID(ctx context.Context, id string, v interface{}) error {
	return r.stationTable.R_UnsafeUpdateByID(ctx, id, v)
}
func (r wastewaterStationRepository) R_CreateMany(ctx context.Context, v []interface{}) ([]interface{}, error) {
	return r.stationTable.R_CreateMany(ctx, v)
}
func (r wastewaterStationRepository) R_SelectOne(ctx context.Context, f bson.M, v interface{}) error {
	return r.stationTable.R_SelectOne(ctx, f, v)
}
func (r wastewaterStationRepository) R_SelectOneWithFields(ctx context.Context, f bson.M, v interface{}, fields bson.M) error {
	return r.stationTable.R_SelectOneWithFields(ctx, f, v, fields)
}
func (r wastewaterStationRepository) R_SelectManyWithFields(ctx context.Context, f bson.M, v interface{}, fields bson.M) error {
	return r.stationTable.R_SelectManyWithFields(ctx, f, v, fields)
}
func (r wastewaterStationRepository) R_SelectByID(ctx context.Context, id string, v interface{}) error {
	return r.stationTable.R_SelectByID(ctx, id, v)
}
func (r wastewaterStationRepository) R_SelectMany(ctx context.Context, f bson.M, v interface{}) error {
	return r.stationTable.R_SelectMany(ctx, f, v)
}
func (r wastewaterStationRepository) R_SelectManyWithSort(ctx context.Context, f bson.M, sort bson.M, v interface{}) error {
	return r.stationTable.R_SelectManyWithSort(ctx, f, sort, v)
}
func (r wastewaterStationRepository) R_SelectDistinct(ctx context.Context, field string, f bson.M) ([]interface{}, error) {
	return r.stationTable.R_SelectDistinct(ctx, field, f)
}
func (r wastewaterStationRepository) R_UpdateAll(ctx context.Context, f bson.M, update interface{}) error {
	return r.stationTable.R_UpdateAll(ctx, f, update)
}
func (r wastewaterStationRepository) R_SelectAndSort(ctx context.Context, f bson.M, sortFields interface{}, skip, limit int64, res interface{}) error {
	return r.stationTable.R_SelectAndSort(ctx, f, sortFields, skip, limit, res)
}
func (r wastewaterStationRepository) R_Pipe(ctx context.Context, pipeline []bson.M, res interface{}) error {
	return r.stationTable.R_Pipe(ctx, pipeline, res)
}
func (r wastewaterStationRepository) R_Count(ctx context.Context, f bson.M) (int64, error) {
	return r.stationTable.R_Count(ctx, f)
}
func (r wastewaterStationRepository) R_CountPipe(ctx context.Context, f filter.Filter) (int64, error) {
	return r.stationTable.R_CountPipe(ctx, f)
}
func (r wastewaterStationRepository) R_Upsert(ctx context.Context, f, update bson.M) (*mongo.UpdateResult, error) {
	return r.stationTable.R_Upsert(ctx, f, update)
}
func (r wastewaterStationRepository) R_UpdateManyWithOpts(ctx context.Context, f bson.M, update interface{}, opts *options.UpdateOptions) error {
	return r.stationTable.R_UpdateManyWithOpts(ctx, f, update, opts)
}

func (r wastewaterStationRepository) GetByID(ctx context.Context, id string) (*models.WastewaterStation, error) {
	var m *models.WastewaterStation
	return m, r.stationTable.R_SelectByID(ctx, id, &m)
}

func (r wastewaterStationRepository) Create(ctx context.Context, input *models.WastewaterStation) (*models.WastewaterStation, error) {
	return input, r.stationTable.R_Create(ctx, input)
}

func (r wastewaterStationRepository) Update(ctx context.Context, id string, input *models.WastewaterStation) error {
	input.ID = id
	return r.stationTable.R_Update(ctx, input)
}

func (r wastewaterStationRepository) Delete(ctx context.Context, id string) error {
	return r.stationTable.R_DeleteByID(ctx, id)
}

func (r wastewaterStationRepository) List(ctx context.Context, f filter.Filter) ([]*models.WastewaterStation, int64, error) {
	var items []*models.WastewaterStation
	total, err := r.stationTable.R_SearchAndCount(ctx, f, &items)
	return items, total, err
}

func (r wastewaterStationRepository) ListFiltered(ctx context.Context, orgID string, ids []string) ([]*models.WastewaterStation, error) {
	query := bson.M{
		"$or": []bson.M{
			{"org_id": orgID},
			{"shared_org_ids": orgID},
			{"share_all": true},
			{"_id": bson.M{"$in": ids}},
		},
	}
	var items []*models.WastewaterStation
	err := r.stationTable.R_SelectMany(ctx, query, &items)
	return items, err
}

// Reports
func (r wastewaterStationRepository) CreateReport(ctx context.Context, report *models.WastewaterStationReport) (*models.WastewaterStationReport, error) {
	return report, r.reportTable.R_Create(ctx, report)
}

func (r wastewaterStationRepository) ListReports(ctx context.Context, f filter.Filter) ([]*models.WastewaterStationReport, int64, error) {
	var items []*models.WastewaterStationReport
	total, err := r.reportTable.R_SearchAndCount(ctx, f, &items)
	return items, total, err
}
