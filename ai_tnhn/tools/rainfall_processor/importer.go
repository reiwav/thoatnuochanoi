package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/rs/xid"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// RainfallData represents the structure of the JSON file: StationName -> Date -> RainfallValue
type RainfallData map[string]map[string]float64

// HistoricalRainRecord matches the MongoDB document structure in hanoi_drainage
type HistoricalRainRecord struct {
	ID        string  `bson:"_id"`
	Station   string  `bson:"station"`
	Date      string  `bson:"date"`
	Rainfall  float64 `bson:"rainfall"`
	CTime     int64   `bson:"created_at"`
	MTime     int64   `bson:"updated_at"`
	DTime     int64   `bson:"deleted_at"`
}

func main() {
	// Flags
	jsonPath := flag.String("file", "rainfall_data.json", "Path to the rainfall_data.json file")
	dbURI := flag.String("uri", "mongodb://tnhn:tnhn%402026%40vietnam@103.214.9.98:37017", "MongoDB Connection URI")
	dbName := flag.String("db", "hanoi_drainage", "MongoDB database name")
	dryRun := flag.Bool("dry-run", false, "Preview the import without writing to database")
	flag.Parse()

	fmt.Println("==================================================================")
	fmt.Println("             RAINFALL HISTORICAL DATA IMPORTER                    ")
	fmt.Println("==================================================================")
	if *dryRun {
		fmt.Println("[DRY RUN MODE] - No database modifications will be made.")
	}

	// 1. Read JSON file
	fmt.Printf("Reading JSON file: %s...\n", *jsonPath)
	fileBytes, err := os.ReadFile(*jsonPath)
	if err != nil {
		log.Fatalf("Error reading JSON file: %v", err)
	}

	var data RainfallData
	if err := json.Unmarshal(fileBytes, &data); err != nil {
		log.Fatalf("Error parsing JSON: %v", err)
	}

	// Calculate total parsed data points
	totalParsed := 0
	for _, dates := range data {
		totalParsed += len(dates)
	}
	fmt.Printf("Successfully parsed JSON. Stations: %d, Total records: %d\n", len(data), totalParsed)

	// 2. Connect to MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	fmt.Printf("Connecting to MongoDB: %s...\n", *dbURI)
	clientOpts := options.Client().ApplyURI(*dbURI)
	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		log.Fatalf("Connection failed: %v", err)
	}
	defer client.Disconnect(ctx)

	if err := client.Ping(ctx, nil); err != nil {
		log.Fatalf("Ping failed: %v", err)
	}
	fmt.Printf("Connected successfully to DB: %s\n", *dbName)

	collection := client.Database(*dbName).Collection("historical_rain_records")

	// 3. Retrieve existing records to avoid duplicates
	fmt.Println("Fetching existing records from historical_rain_records to prevent duplicates...")
	existingMap := make(map[string]bool) // Key: "StationName|YYYY-MM-DD"
	
	cursor, err := collection.Find(ctx, bson.M{})
	if err != nil {
		log.Fatalf("Error querying existing records: %v", err)
	}
	defer cursor.Close(ctx)

	type miniRecord struct {
		Station string `bson:"station"`
		Date    string `bson:"date"`
	}

	var rawExisting []miniRecord
	if err := cursor.All(ctx, &rawExisting); err != nil {
		log.Fatalf("Error decoding existing records: %v", err)
	}

	for _, rec := range rawExisting {
		key := fmt.Sprintf("%s|%s", rec.Station, rec.Date)
		existingMap[key] = true
	}
	fmt.Printf("Found %d existing records in database.\n", len(existingMap))

	// 4. Filter and prepare new records
	var recordsToInsert []interface{}
	nowUnix := time.Now().Unix()

	for stationName, dates := range data {
		for dateStr, rainfallVal := range dates {
			key := fmt.Sprintf("%s|%s", stationName, dateStr)
			if existingMap[key] {
				// Already exists, skip
				continue
			}

			// Generate document
			record := HistoricalRainRecord{
				ID:       "hrr_" + xid.New().String(),
				Station:  stationName,
				Date:     dateStr,
				Rainfall: rainfallVal,
				CTime:    nowUnix,
				MTime:    nowUnix,
				DTime:    0,
			}
			recordsToInsert = append(recordsToInsert, record)
		}
	}

	totalToInsert := len(recordsToInsert)
	fmt.Printf("Analysis complete:\n")
	fmt.Printf("  - Total entries in JSON: %d\n", totalParsed)
	fmt.Printf("  - Already exist in DB: %d\n", totalParsed-totalToInsert)
	fmt.Printf("  - New records to insert: %d\n", totalToInsert)

	if totalToInsert == 0 {
		fmt.Println("All records already exist in the database. No import needed.")
		return
	}

	// 5. Run Dry-run or actual Insert
	if *dryRun {
		fmt.Println("\n[DRY RUN] Preview of first 10 records to be inserted:")
		limit := 10
		if len(recordsToInsert) < limit {
			limit = len(recordsToInsert)
		}
		for i := 0; i < limit; i++ {
			rec := recordsToInsert[i].(HistoricalRainRecord)
			fmt.Printf("  Record %2d: ID=%s, Station=%s, Date=%s, Rainfall=%.1f mm\n", i+1, rec.ID, rec.Station, rec.Date, rec.Rainfall)
		}
		fmt.Println("[DRY RUN] Finished preview. No data was written.")
		return
	}

	fmt.Println("\nStarting bulk insert to database...")
	// Insert in batches of 1000 to be safe and memory-efficient
	batchSize := 1000
	insertedCount := 0

	for i := 0; i < len(recordsToInsert); i += batchSize {
		end := i + batchSize
		if end > len(recordsToInsert) {
			end = len(recordsToInsert)
		}
		
		batch := recordsToInsert[i:end]
		_, err := collection.InsertMany(ctx, batch)
		if err != nil {
			log.Fatalf("Error inserting batch at index %d: %v", i, err)
		}
		insertedCount += len(batch)
		fmt.Printf("  Inserted batch %d-%d (%d/%d)...\n", i+1, end, insertedCount, totalToInsert)
	}

	fmt.Printf("\nSUCCESS! Imported %d new historical rain records into historical_rain_records.\n", insertedCount)
	fmt.Println("==================================================================")
}
