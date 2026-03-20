package main

import (
	"context"
	"fmt"
	"log"
	"sensor-backend/config"
	"sensor-backend/internal/db"
)

func main() {
	cfg := config.LoadConfig()
	database, err := db.ConnectMongo(cfg)
	if err != nil {
		log.Fatal(err)
	}
	err = database.Collection("calibrations").Drop(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Dropped calibrations collection")
}
