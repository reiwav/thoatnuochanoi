package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"sensor-backend/config"
	"sensor-backend/internal/cron"
	"sensor-backend/internal/db"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	cfg := config.LoadConfig()
	database, err := db.ConnectMongo(cfg)
	if err != nil {
		log.Fatal(err)
	}

	ctx := context.Background()
	historyColl := database.Collection("history_trend")

	indexModel := mongo.IndexModel{
		Keys: bson.D{
			{Key: "device_link", Value: 1},
			{Key: "code", Value: 1},
			{Key: "sensor_type", Value: 1},
			{Key: "timestamp", Value: 1},
		},
		Options: options.Index().SetUnique(true),
	}
	historyColl.Indexes().CreateOne(ctx, indexModel)

	startDate := "2026-01-01"
	endDate := "2026-03-19"

	if len(os.Args) >= 3 {
		startDate = os.Args[1]
		endDate = os.Args[2]
	} else {
		now := time.Now()
		endDate = now.Format("2006-01-02")
		startDate = now.Format("2006-01-02")
		fmt.Printf("Using default 1 day: %s to %s (Pass args to override)\n", startDate, endDate)
	}

	cron.FetchHistoryData(ctx, database, startDate, endDate, nil)
}
