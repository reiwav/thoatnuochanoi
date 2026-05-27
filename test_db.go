package main

import (
	"context"
	"fmt"
	"ai-api-tnhn/config"
	"ai-api-tnhn/internal/base/mgo/db"
	"ai-api-tnhn/internal/models"
	"log"
	"github.com/caarlos0/env/v6"
	"go.mongodb.org/mongo-driver/bson"
)

func main() {
	var cfg config.Config
	if err := env.Parse(&cfg); err != nil {
		log.Fatalf("Parse config error: %v", err)
	}
	db.InitDb(cfg.DB.Path, cfg.DB.DBUser, cfg.DB.DBPass, cfg.DB.DBName)
	ctx := context.Background()
	table := db.NewTable("organizations", "org")
	var orgs []models.Organization
	cursor, err := table.Find(ctx, bson.M{})
	if err != nil {
		panic(err)
	}
	if err = cursor.All(ctx, &orgs); err != nil {
		panic(err)
	}
	for _, o := range orgs {
		fmt.Printf("Org: %v, ID: '%v', DriveFolderID: '%v'\n", o.Name, o.ID, o.DriveFolderID)
	}
}
