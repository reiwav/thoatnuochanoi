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

	colls := []string{"alarms", "monitors", "outputs"}
	for _, coll := range colls {
		if err := database.Collection(coll).Drop(context.Background()); err != nil {
			fmt.Println("Error dropping", coll, ":", err)
		} else {
			fmt.Println("Dropped", coll, "collection")
		}
	}
}
