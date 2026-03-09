package main

import (
	"ai-api-tnhn/config"
	"ai-api-tnhn/internal/base/mgo/db"
	"ai-api-tnhn/internal/base/model"
	"ai-api-tnhn/internal/models"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	conf := config.LoadEnv()
	client, err := db.ConnectMongo(conf.DB)
	if err != nil {
		panic(err)
	}

	coll := client.DB.Collection("historical_rain_records")

	filePath := "../tools/rainfall_processor/rainfall_data.json"
	data, err := os.ReadFile(filePath)
	if err != nil {
		fmt.Printf("Error reading JSON file at %s: %v\n", filePath, err)
		return
	}

	var rawData map[string]map[string]float64
	if err := json.Unmarshal(data, &rawData); err != nil {
		fmt.Printf("Error parsing JSON: %v\n", err)
		return
	}

	count := 0
	startTime := time.Now()

	for station, records := range rawData {
		for date, rainfall := range records {
			record := models.HistoricalRainRecord{
				BaseModel: model.BaseModel{
					ID:    fmt.Sprintf("%s_%s", station, date),
					CTime: time.Now().Unix(),
					MTime: time.Now().Unix(),
				},
				Station:  station,
				Date:     date,
				Rainfall: rainfall,
			}

			_, err := coll.UpdateOne(
				context.Background(),
				bson.M{"_id": record.ID},
				bson.M{"$set": record},
				options.Update().SetUpsert(true),
			)
			if err != nil {
				fmt.Printf("Error processing %s (%s): %v\n", station, date, err)
			} else {
				count++
				if count%1000 == 0 {
					fmt.Printf("Processed %d records... (%v elapsed)\n", count, time.Since(startTime))
				}
			}
		}
	}

	fmt.Printf("\nSeeding complete! Total records: %d. Time taken: %v\n", count, time.Since(startTime))
}
