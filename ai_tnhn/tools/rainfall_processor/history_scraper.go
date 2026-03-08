package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/rs/xid"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Station struct {
	Id        interface{} `json:"Id"`
	TenTram   string      `json:"TenTram"`
	TenPhuong string      `json:"TenPhuong,omitempty"`
	Loai      string      `json:"Loai,omitempty"`
}

type Record struct {
	ID          string    `bson:"_id" json:"_id"`
	StationID   int64     `bson:"station_id" json:"station_id"`
	StationName string    `bson:"station_name" json:"station_name"`
	Date        string    `bson:"date" json:"date"`
	Timestamp   time.Time `bson:"timestamp" json:"timestamp"`
	Value       float64   `bson:"value" json:"value"`
}

type WaterDataPoint struct {
	ThoiGian  string  `json:"ThoiGian"`
	ThuongLuu float64 `json:"ThuongLuu"`
}

type QueuedRecord struct {
	Record Record
	Type   string
}

var (
	collections map[string]*mongo.Collection
	muJSON      sync.Mutex
	allData     []Record
	recordChan  chan QueuedRecord
)

func main() {
	startFlag := flag.String("start", "2024-01-01", "Start date (YYYY-MM-DD)")
	endFlag := flag.String("end", time.Now().Format("2006-01-02"), "End date (YYYY-MM-DD)")
	workers := flag.Int("workers", 10, "Number of concurrent workers")
	batchSize := flag.Int("batch", 1000, "MongoDB batch insert size")
	flag.Parse()

	// MongoDB Setup
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	client, err := mongo.Connect(ctx, options.Client().ApplyURI("mongodb://localhost:27017"))
	if err != nil {
		log.Printf("Connecting to local Mongo failed: %v", err)
	} else {
		db := client.Database("hanoi_drainage")
		collections = map[string]*mongo.Collection{
			"rain":  db.Collection("rain_records"),
			"lake":  db.Collection("lake_records"),
			"river": db.Collection("river_records"),
		}
	}

	// Load Stations
	rainStations := loadStations("tram_mua_data.json")
	// waterStations := loadStations("tram_nuoc.json")

	startDate, _ := time.Parse("2006-01-02", *startFlag)
	endDate, _ := time.Parse("2006-01-02", *endFlag)

	jobs := make(chan struct {
		Date    time.Time
		Station Station
		SType   string
	}, 20000)

	recordChan = make(chan QueuedRecord, 5000)
	var batchWg sync.WaitGroup
	batchWg.Add(1)
	go batchSaver(recordChan, &batchWg, *batchSize)

	var wg sync.WaitGroup
	for w := 1; w <= *workers; w++ {
		wg.Add(1)
		go worker(jobs, recordChan, &wg)
	}

	for d := startDate; !d.After(endDate); d = d.AddDate(0, 0, 1) {
		for _, s := range rainStations {
			jobs <- struct {
				Date    time.Time
				Station Station
				SType   string
			}{d, s, "rain"}
		}
		// for _, s := range waterStations {
		// 	stype := "river"
		// 	if s.Loai == "2" {
		// 		stype = "lake"
		// 	}
		// 	jobs <- struct {
		// 		Date    time.Time
		// 		Station Station
		// 		SType   string
		// 	}{d, s, stype}
		// }
		fmt.Printf("Queued: %s\r", d.Format("2006-01-02"))
	}
	fmt.Println("\nAll dates queued. Waiting for workers...")
	close(jobs)
	wg.Wait()

	close(recordChan)
	batchWg.Wait()

	saveToJSON()
	fmt.Printf("Scraping complete. Total records: %d\n", len(allData))
}

func batchSaver(ch <-chan QueuedRecord, wg *sync.WaitGroup, batchSize int) {
	defer wg.Done()
	batches := map[string][]interface{}{
		"rain":  {},
		"lake":  {},
		"river": {},
	}

	flush := func(stype string) {
		if len(batches[stype]) == 0 {
			return
		}
		if collections != nil {
			if col, ok := collections[stype]; ok {
				_, err := col.InsertMany(context.Background(), batches[stype])
				if err != nil {
					log.Printf("Batch insert error for %s: %v", stype, err)
				}
			}
		}
		batches[stype] = []interface{}{}
	}

	for qr := range ch {
		batches[qr.Type] = append(batches[qr.Type], qr.Record)

		// Add to JSON buffer
		muJSON.Lock()
		allData = append(allData, qr.Record)
		muJSON.Unlock()

		if len(batches[qr.Type]) >= batchSize {
			flush(qr.Type)
		}
	}

	// Final flush
	flush("rain")
	flush("lake")
	flush("river")
}

func loadStations(filename string) []Station {
	data, err := os.ReadFile(filename)
	if err != nil {
		return nil
	}
	var stations []Station
	if err := json.Unmarshal(data, &stations); err != nil {
		return nil
	}
	return stations
}

func worker(jobs <-chan struct {
	Date    time.Time
	Station Station
	SType   string
}, out chan<- QueuedRecord, wg *sync.WaitGroup) {
	defer wg.Done()
	client := &http.Client{Timeout: 30 * time.Second}

	for j := range jobs {
		id := getID(j.Station.Id)
		dateStr := j.Date.Format("2006-01-02")
		apiType := "solieumua"
		if j.SType == "lake" {
			apiType = "solieuho"
		} else if j.SType == "river" {
			apiType = "solieusong"
		}

		url := fmt.Sprintf("https://thoatnuochanoi.vn/qlnl/Contains/ajax/phai.ashx?type=%s&tram=%d&ngay=%s", apiType, id, dateStr)
		req, _ := http.NewRequest("GET", url, nil)
		req.Header.Set("User-Agent", "Mozilla/5.0")
		req.Header.Set("Connection", "keep-alive")
		req.Header.Set("Cookie", "ASP.NET_SessionId=5xazplb5mwlmi4hr0hyqy0th")
		req.Header.Set("referer", "https://thoatnuochanoi.vn/qlnl/bieu-do-mua")
		resp, err := client.Do(req)
		if err != nil {
			continue
		}
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if j.SType == "rain" {
			parseRainBody(body, id, j.Station.TenTram, dateStr, out)
		} else {
			parseWaterBody(body, id, j.Station.TenTram, j.SType, out)
		}
	}
}

func parseRainBody(body []byte, id int64, name, dateStr string, out chan<- QueuedRecord) {
	var apiData map[string]interface{}
	if err := json.Unmarshal(body, &apiData); err != nil {
		return
	}

	for timeKey, val := range apiData {
		if timeKey == "Data" || timeKey == "Tram" {
			continue
		}

		var fVal float64
		switch v := val.(type) {
		case float64:
			fVal = v
		case string:
			fVal, _ = strconv.ParseFloat(v, 64)
		default:
			continue
		}

		ts, err := time.Parse("2006-01-02 15:04", dateStr+" "+timeKey)
		if err != nil {
			continue
		}
		record := Record{
			ID:          xid.New().String(),
			StationID:   id,
			StationName: name,
			Date:        dateStr,
			Timestamp:   ts,
			Value:       fVal,
		}
		out <- QueuedRecord{record, "rain"}
	}
}

func parseWaterBody(body []byte, id int64, name, stype string, out chan<- QueuedRecord) {
	var apiData struct {
		Data string `json:"Data"`
	}
	if err := json.Unmarshal(body, &apiData); err != nil {
		return
	}

	if apiData.Data == "" || apiData.Data == "[]" {
		return
	}

	var dataPoints []WaterDataPoint
	if err := json.Unmarshal([]byte(apiData.Data), &dataPoints); err != nil {
		return
	}

	for _, dp := range dataPoints {
		var ts time.Time
		var err error

		formats := []string{"2006-01-02T15:04:05", "2006-01-02 15:04:05"}
		for _, f := range formats {
			ts, err = time.Parse(f, dp.ThoiGian)
			if err == nil {
				break
			}
		}

		if err != nil {
			continue
		}

		record := Record{
			ID:          xid.New().String(),
			StationID:   id,
			StationName: name,
			Date:        ts.Format("2006-01-02"),
			Timestamp:   ts,
			Value:       dp.ThuongLuu,
		}
		out <- QueuedRecord{record, stype}
	}
}

func getID(id interface{}) int64 {
	switch v := id.(type) {
	case float64:
		return int64(v)
	case string:
		i, _ := strconv.ParseInt(v, 10, 64)
		return i
	case int64:
		return v
	case int:
		return int64(v)
	}
	return 0
}

func saveToJSON() {
	muJSON.Lock()
	defer muJSON.Unlock()
	data, _ := json.MarshalIndent(allData, "", "  ")
	os.WriteFile("historical_data.json", data, 0644)
}
