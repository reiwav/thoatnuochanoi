package query

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/base/mgo/db"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type historicalRainRepository struct {
	*db.Table
}

func NewHistoricalRainRepo(dbc *mongo.Database, name, prefix string, l logger.Logger) repository.HistoricalRain {
	return historicalRainRepository{db.NewTable(name, prefix, dbc, l)}
}

func (p historicalRainRepository) FindAll(ctx context.Context) ([]*models.HistoricalRainRecord, error) {
	var results []*models.HistoricalRainRecord
	err := p.R_SelectMany(ctx, bson.M{}, &results)
	return results, err
}

func (p historicalRainRepository) GetMonthlyTotals(ctx context.Context, years []int) ([]*models.MonthlyTotal, error) {
	// Match years
	yearFilters := bson.A{}
	for _, y := range years {
		yearFilters = append(yearFilters, bson.M{"date": bson.M{"$regex": fmt.Sprintf("^%d-", y)}})
	}

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"$or": yearFilters}}},
		{{Key: "$project", Value: bson.M{
			"station":  1,
			"rainfall": 1,
			"year":     bson.M{"$toInt": bson.M{"$arrayElemAt": bson.A{bson.M{"$split": bson.A{"$date", "-"}}, 0}}},
			"month":    bson.M{"$toInt": bson.M{"$arrayElemAt": bson.A{bson.M{"$split": bson.A{"$date", "-"}}, 1}}},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id": bson.M{
				"station": "$station",
				"year":    "$year",
				"month":   "$month",
			},
			"total": bson.M{"$sum": "$rainfall"},
		}}},
		{{Key: "$project", Value: bson.M{
			"_id_station": "$_id.station",
			"_id_year":    "$_id.year",
			"_id_month":   "$_id.month",
			"total":       1,
		}}},
	}

	cursor, err := p.Collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []*models.MonthlyTotal
	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}

	return results, nil
}
