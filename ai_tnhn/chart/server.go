package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type RainRecord struct {
	Timestamp time.Time `bson:"timestamp" json:"timestamp"`
	Value     float64   `bson:"value" json:"value"`
}

var client *mongo.Client
var collection *mongo.Collection

func main() {
	// MongoDB Setup
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var err error
	client, err = mongo.Connect(ctx, options.Client().ApplyURI("mongodb://localhost:27017"))
	if err != nil {
		log.Fatal(err)
	}

	collection = client.Database("hanoi_drainage").Collection("rain_records")

	http.HandleFunc("/api/rain", handleRainData)
	http.Handle("/", http.FileServer(http.Dir(".")))

	fmt.Println("Server starting at http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func handleRainData(w http.ResponseWriter, r *http.Request) {
	stationIDStr := r.URL.Query().Get("station_id")
	startStr := r.URL.Query().Get("start")
	endStr := r.URL.Query().Get("end")

	stationID, _ := strconv.ParseInt(stationIDStr, 10, 64)
	startTime, _ := time.Parse("2006-01-02", startStr)
	endTime, _ := time.Parse("2006-01-02", endStr)
	if endStr != "" {
		endTime = endTime.Add(24 * time.Hour)
	} else {
		endTime = time.Now()
	}

	filter := bson.M{
		"station_id": stationID,
		"timestamp": bson.M{
			"$gte": startTime,
			"$lt":  endTime,
		},
	}

	opts := options.Find().SetSort(bson.D{{Key: "timestamp", Value: 1}})
	cursor, err := collection.Find(context.Background(), filter, opts)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer cursor.Close(context.Background())

	var records []RainRecord
	if err := cursor.All(context.Background(), &records); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(records)
}
