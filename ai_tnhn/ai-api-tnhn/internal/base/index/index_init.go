package index

import (
	"context"
	"log"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
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

	collections := []string{"historical_rain_records"}

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
// Indexes (TỐI GIẢN – CODE XỬ LÝ LOGIC)
// ---------------------------------------------------

func ensureIndexes(ctx context.Context, db *mongo.Database) error {
	return nil
}
