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
	err = database.Collection("sensor_history").Drop(context.Background())
	if err == nil {
		fmt.Println("Dropped sensor_history collection")
	}

	err = database.Collection("history_trend").Drop(context.Background())
	if err == nil {
		fmt.Println("Dropped history_trend collection")
	}

	fmt.Println("Done clearing history!")
}
