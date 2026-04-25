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

type pumpingStationRepository struct {
	stationTable *db.Table
	historyTable *db.Table
}

func NewPumpingStationRepo(dbc *mongo.Database, l logger.Logger) repository.PumpingStation {
	return pumpingStationRepository{
		stationTable: db.NewTable("pumping_stations", "ps", dbc, l),
		historyTable: db.NewTable("pumping_station_histories", "psh", dbc, l),
	}
}

// Implement mgo.BaseTable by proxying to stationTable
func (r pumpingStationRepository) GetCollection() *mongo.Collection { return r.stationTable.GetCollection() }
func (r pumpingStationRepository) R_Search(ctx context.Context, f filter.Filter, val interface{}) error {
	return r.stationTable.R_Search(ctx, f, val)
}
func (r pumpingStationRepository) R_SearchAndCount(ctx context.Context, f filter.Filter, val interface{}) (int64, error) {
	return r.stationTable.R_SearchAndCount(ctx, f, val)
}
func (r pumpingStationRepository) R_CreateIndexOne(ctx context.Context, mode mongo.IndexModel, opts ...*options.CreateIndexesOptions) error {
	return r.stationTable.R_CreateIndexOne(ctx, mode, opts...)
}
func (r pumpingStationRepository) R_CreateIndexMany(ctx context.Context, mods []mongo.IndexModel, opts ...*options.CreateIndexesOptions) error {
	return r.stationTable.R_CreateIndexMany(ctx, mods, opts...)
}
func (r pumpingStationRepository) R_Create(ctx context.Context, m model.IModel) error {
	return r.stationTable.R_Create(ctx, m)
}
func (r pumpingStationRepository) R_CreateForce(ctx context.Context, m model.IModel) error {
	return r.stationTable.R_CreateForce(ctx, m)
}
func (r pumpingStationRepository) R_Update(ctx context.Context, m model.IModel) error {
	return r.stationTable.R_Update(ctx, m)
}
func (r pumpingStationRepository) R_Delete(ctx context.Context, id string, m model.IModel) error {
	return r.stationTable.R_Delete(ctx, id, m)
}
func (r pumpingStationRepository) R_DeleteByID(ctx context.Context, id string) error {
	return r.stationTable.R_DeleteByID(ctx, id)
}
func (r pumpingStationRepository) R_SelectAndDelete(ctx context.Context, id string) error {
	return r.stationTable.R_SelectAndDelete(ctx, id)
}
func (r pumpingStationRepository) R_UnsafeUpdate(ctx context.Context, f bson.M, v interface{}) error {
	return r.stationTable.R_UnsafeUpdate(ctx, f, v)
}
func (r pumpingStationRepository) R_UpdateForce(ctx context.Context, f bson.M, v interface{}) error {
	return r.stationTable.R_UpdateForce(ctx, f, v)
}
func (r pumpingStationRepository) R_UnsafeUpdateByID(ctx context.Context, id string, v interface{}) error {
	return r.stationTable.R_UnsafeUpdateByID(ctx, id, v)
}
func (r pumpingStationRepository) R_CreateMany(ctx context.Context, v []interface{}) ([]interface{}, error) {
	return r.stationTable.R_CreateMany(ctx, v)
}
func (r pumpingStationRepository) R_SelectOne(ctx context.Context, f bson.M, v interface{}) error {
	return r.stationTable.R_SelectOne(ctx, f, v)
}
func (r pumpingStationRepository) R_SelectOneWithFields(ctx context.Context, f bson.M, v interface{}, fields bson.M) error {
	return r.stationTable.R_SelectOneWithFields(ctx, f, v, fields)
}
func (r pumpingStationRepository) R_SelectManyWithFields(ctx context.Context, f bson.M, v interface{}, fields bson.M) error {
	return r.stationTable.R_SelectManyWithFields(ctx, f, v, fields)
}
func (r pumpingStationRepository) R_SelectByID(ctx context.Context, id string, v interface{}) error {
	return r.stationTable.R_SelectByID(ctx, id, v)
}
func (r pumpingStationRepository) R_SelectMany(ctx context.Context, f bson.M, v interface{}) error {
	return r.stationTable.R_SelectMany(ctx, f, v)
}
func (r pumpingStationRepository) R_SelectManyWithSort(ctx context.Context, f bson.M, sort bson.M, v interface{}) error {
	return r.stationTable.R_SelectManyWithSort(ctx, f, sort, v)
}
func (r pumpingStationRepository) R_SelectDistinct(ctx context.Context, field string, f bson.M) ([]interface{}, error) {
	return r.stationTable.R_SelectDistinct(ctx, field, f)
}
func (r pumpingStationRepository) R_UpdateAll(ctx context.Context, f bson.M, update interface{}) error {
	return r.stationTable.R_UpdateAll(ctx, f, update)
}
func (r pumpingStationRepository) R_SelectAndSort(ctx context.Context, f bson.M, sortFields interface{}, skip, limit int64, res interface{}) error {
	return r.stationTable.R_SelectAndSort(ctx, f, sortFields, skip, limit, res)
}
func (r pumpingStationRepository) R_Pipe(ctx context.Context, pipeline []bson.M, res interface{}) error {
	return r.stationTable.R_Pipe(ctx, pipeline, res)
}
func (r pumpingStationRepository) R_Count(ctx context.Context, f bson.M) (int64, error) {
	return r.stationTable.R_Count(ctx, f)
}
func (r pumpingStationRepository) R_CountPipe(ctx context.Context, f filter.Filter) (int64, error) {
	return r.stationTable.R_CountPipe(ctx, f)
}
func (r pumpingStationRepository) R_Upsert(ctx context.Context, f, update bson.M) (*mongo.UpdateResult, error) {
	return r.stationTable.R_Upsert(ctx, f, update)
}
func (r pumpingStationRepository) R_UpdateManyWithOpts(ctx context.Context, f bson.M, update interface{}, opts *options.UpdateOptions) error {
	return r.stationTable.R_UpdateManyWithOpts(ctx, f, update, opts)
}

func (r pumpingStationRepository) GetByID(ctx context.Context, id string) (*models.PumpingStation, error) {
	var m *models.PumpingStation
	return m, r.stationTable.R_SelectByID(ctx, id, &m)
}

func (r pumpingStationRepository) Create(ctx context.Context, input *models.PumpingStation) (*models.PumpingStation, error) {
	return input, r.stationTable.R_Create(ctx, input)
}

func (r pumpingStationRepository) Update(ctx context.Context, id string, input *models.PumpingStation) error {
	input.ID = id
	return r.stationTable.R_Update(ctx, input)
}

func (r pumpingStationRepository) Delete(ctx context.Context, id string) error {
	return r.stationTable.R_DeleteByID(ctx, id)
}

func (r pumpingStationRepository) List(ctx context.Context, filter filter.Filter) ([]*models.PumpingStation, int64, error) {
	var items []*models.PumpingStation
	total, err := r.stationTable.R_SearchAndCount(ctx, filter, &items)
	return items, total, err
}

// History
func (r pumpingStationRepository) CreateHistory(ctx context.Context, history *models.PumpingStationHistory) (*models.PumpingStationHistory, error) {
	return history, r.historyTable.R_Create(ctx, history)
}

func (r pumpingStationRepository) ListHistory(ctx context.Context, filter filter.Filter) ([]*models.PumpingStationHistory, int64, error) {
	var items []*models.PumpingStationHistory
	total, err := r.historyTable.R_SearchAndCount(ctx, filter, &items)
	return items, total, err
}
