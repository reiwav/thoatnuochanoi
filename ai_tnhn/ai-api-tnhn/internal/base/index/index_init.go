package index

import (
	"context"
	"log"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func InitMongoSchema(ctx context.Context, db *mongo.Database) error {
	if err := ensureCollections(ctx, db); err != nil {
		return err
	}
	if err := ensureIndexes(ctx, db); err != nil {
		return err
	}
	log.Println("[Mongo] Schema initialized")
	return nil
}

// ---------------------------------------------------
// Collections
// ---------------------------------------------------

func ensureCollections(ctx context.Context, db *mongo.Database) error {
	existing, err := db.ListCollectionNames(ctx, bson.M{})
	if err != nil {
		return err
	}

	exist := map[string]bool{}
	for _, c := range existing {
		exist[c] = true
	}

	collections := []string{
		"users", "tokens", "roles", "permissions", "role_permissions",
		"organizations", "rain_stations", "lake_stations", "river_stations",
		"rain_records", "lake_records", "river_records",
		"inundation_stations", "inundation_reports", "inundation_updates",
		"historical_rain_records", "ai_chat_logs", "ai_usage_records",
		"emergency_constructions", "emergency_construction_histories", "emergency_construction_progress",
		"contract_categories", "contracts", "settings",
		"pumping_stations", "pumping_station_histories",
		"wastewater_stations", "wastewater_station_reports",
		"sluice_gates", "sluice_gate_history",
	}

	for _, c := range collections {
		if !exist[c] {
			if err := db.CreateCollection(ctx, c); err != nil {
				return err
			}
			log.Println("[Mongo] Created collection:", c)
		}
	}
	return nil
}

// ---------------------------------------------------
// Indexes
// ---------------------------------------------------

func ensureIndexes(ctx context.Context, db *mongo.Database) error {
	partialFilter := bson.D{{Key: "deleted_at", Value: 0}}

	indexMap := map[string][]mongo.IndexModel{
		"users": {
			{Keys: bson.D{{Key: "email", Value: 1}}, Options: options.Index().SetUnique(true).SetPartialFilterExpression(partialFilter)},
			{Keys: bson.D{{Key: "username", Value: 1}}, Options: options.Index().SetUnique(true).SetPartialFilterExpression(partialFilter)},
			{Keys: bson.D{{Key: "org_id", Value: 1}}},
		},
		"tokens": {
			{Keys: bson.D{{Key: "user_id", Value: 1}}},
		},
		"roles": {
			{Keys: bson.D{{Key: "code", Value: 1}}, Options: options.Index().SetUnique(true).SetPartialFilterExpression(partialFilter)},
		},
		"permissions": {
			{Keys: bson.D{{Key: "code", Value: 1}}, Options: options.Index().SetUnique(true).SetPartialFilterExpression(partialFilter)},
		},
		"role_permissions": {
			{Keys: bson.D{{Key: "role_id", Value: 1}}},
		},
		"organizations": {
			{Keys: bson.D{{Key: "code", Value: 1}}, Options: options.Index().SetUnique(true).SetPartialFilterExpression(partialFilter)},
			{Keys: bson.D{{Key: "name", Value: 1}}},
		},
		"rain_stations": {
			{Keys: bson.D{{Key: "code", Value: 1}}, Options: options.Index().SetUnique(true).SetPartialFilterExpression(partialFilter)},
			{Keys: bson.D{{Key: "org_id", Value: 1}}},
		},
		"lake_stations": {
			{Keys: bson.D{{Key: "code", Value: 1}}, Options: options.Index().SetUnique(true).SetPartialFilterExpression(partialFilter)},
			{Keys: bson.D{{Key: "org_id", Value: 1}}},
		},
		"river_stations": {
			{Keys: bson.D{{Key: "code", Value: 1}}, Options: options.Index().SetUnique(true).SetPartialFilterExpression(partialFilter)},
			{Keys: bson.D{{Key: "org_id", Value: 1}}},
		},
		"rain_records": {
			{Keys: bson.D{{Key: "station_id", Value: 1}}},
			{Keys: bson.D{{Key: "timestamp", Value: 1}}},
			{Keys: bson.D{{Key: "station_id", Value: 1}, {Key: "timestamp", Value: -1}}},
		},
		"lake_records": {
			{Keys: bson.D{{Key: "station_id", Value: 1}}},
			{Keys: bson.D{{Key: "timestamp", Value: 1}}},
			{Keys: bson.D{{Key: "station_id", Value: 1}, {Key: "timestamp", Value: -1}}},
		},
		"river_records": {
			{Keys: bson.D{{Key: "station_id", Value: 1}}},
			{Keys: bson.D{{Key: "timestamp", Value: 1}}},
			{Keys: bson.D{{Key: "station_id", Value: 1}, {Key: "timestamp", Value: -1}}},
		},
		"inundation_stations": {
			{Keys: bson.D{{Key: "org_id", Value: 1}}},
			{Keys: bson.D{{Key: "active", Value: 1}}},
		},
		"inundation_reports": {
			{Keys: bson.D{{Key: "org_id", Value: 1}}},
			{Keys: bson.D{{Key: "created_at", Value: 1}}},
			{Keys: bson.D{{Key: "org_id", Value: 1}, {Key: "created_at", Value: -1}}},
		},
		"inundation_updates": {
			{Keys: bson.D{{Key: "report_id", Value: 1}}},
			{Keys: bson.D{{Key: "created_at", Value: 1}}},
			{Keys: bson.D{{Key: "report_id", Value: 1}, {Key: "created_at", Value: -1}}},
		},
		"historical_rain_records": {
			{Keys: bson.D{{Key: "station", Value: 1}}},
			{Keys: bson.D{{Key: "date", Value: 1}}},
			{Keys: bson.D{{Key: "station", Value: 1}, {Key: "date", Value: 1}}},
		},
		"ai_chat_logs": {
			{Keys: bson.D{{Key: "user_id", Value: 1}}},
			{Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "timestamp", Value: -1}}},
		},
		"ai_usage_records": {
			{Keys: bson.D{{Key: "user_id", Value: 1}}},
		},
		"pumping_stations": {
			{Keys: bson.D{{Key: "org_id", Value: 1}}},
		},
		"pumping_station_histories": {
			{Keys: bson.D{{Key: "station_id", Value: 1}}},
			{Keys: bson.D{{Key: "timestamp", Value: 1}}},
			{Keys: bson.D{{Key: "station_id", Value: 1}, {Key: "timestamp", Value: -1}}},
		},
		"wastewater_stations": {
			{Keys: bson.D{{Key: "org_id", Value: 1}}},
		},
		"wastewater_station_reports": {
			{Keys: bson.D{{Key: "station_id", Value: 1}}},
			{Keys: bson.D{{Key: "timestamp", Value: 1}}},
			{Keys: bson.D{{Key: "station_id", Value: 1}, {Key: "timestamp", Value: -1}}},
		},
		"sluice_gates": {
			{Keys: bson.D{{Key: "org_id", Value: 1}}},
		},
		"sluice_gate_history": {
			{Keys: bson.D{{Key: "sluice_gate_id", Value: 1}}},
			{Keys: bson.D{{Key: "created_at", Value: 1}}},
			{Keys: bson.D{{Key: "sluice_gate_id", Value: 1}, {Key: "created_at", Value: -1}}},
		},
		"settings": {
			{Keys: bson.D{{Key: "key", Value: 1}}, Options: options.Index().SetUnique(true).SetPartialFilterExpression(partialFilter)},
		},
	}

	for collName, indexes := range indexMap {
		_, err := db.Collection(collName).Indexes().CreateMany(ctx, indexes)
		if err != nil {
			log.Printf("[Mongo] Failed to create indexes for %s: %v", collName, err)
			return err
		}
	}
	return nil
}

