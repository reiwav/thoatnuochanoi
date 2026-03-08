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
	"strings"
	"sync"
	"time"

	"github.com/rs/xid"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type RainStation struct {
	Id      interface{} `json:"Id"`
	TenTram string      `json:"TenTram"`
}

type RainDataPoint struct {
	ThoiGian string  `json:"ThoiGian"`
	LuongMua float64 `json:"LuongMua"`
}

type RainRecord struct {
	ID          string    `bson:"_id" json:"_id"`
	StationID   int64     `bson:"station_id" json:"station_id"`
	StationName string    `bson:"station_name" json:"station_name"`
	Date        string    `bson:"date" json:"date"`
	Timestamp   time.Time `bson:"timestamp" json:"timestamp"`
	Value       float64   `bson:"value" json:"value"`
}

var (
	rainCollection *mongo.Collection
	rainSessionID  string
)

func main() {
	startFlag := flag.String("start", "2024-01-01", "Start date (YYYY-MM-DD)")
	endFlag := flag.String("end", time.Now().Format("2006-01-02"), "End date (YYYY-MM-DD)")
	workers := flag.Int("workers", 10, "Number of concurrent workers")
	batchSize := flag.Int("batch", 500, "MongoDB batch insert size")
	sessionFlag := flag.String("session", "5xazplb5mwlmi4hr0hyqy0th", "Valid ASP.NET_SessionId")
	flag.Parse()

	// Use provided session
	rainSessionID = *sessionFlag
	fmt.Printf("Using Session: %s\n", rainSessionID)

	// In the future, re-enable auto-login once 404 is resolved
	// s, err := rainLogin(*userFlag, *passFlag)
	// if err != nil {
	// 	log.Fatalf("Login failed: %v", err)
	// }
	// rainSessionID = s

	// 2. MongoDB Setup
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	client, err := mongo.Connect(ctx, options.Client().ApplyURI("mongodb://localhost:27017"))
	if err != nil {
		log.Fatalf("Connecting to local Mongo failed: %v", err)
	}
	db := client.Database("hanoi_drainage")
	rainCollection = db.Collection("rain_records")

	// 3. Load Stations
	stations := loadRainStations("tram_mua_data.json")
	if len(stations) == 0 {
		log.Fatal("No stations loaded")
	}

	startDate, _ := time.Parse("2006-01-02", *startFlag)
	endDate, _ := time.Parse("2006-01-02", *endFlag)

	jobs := make(chan struct {
		Date    time.Time
		Station RainStation
	}, 10000)

	recordChan := make(chan RainRecord, 2000)
	var batchWg sync.WaitGroup
	batchWg.Add(1)
	go rainBatchSaver(recordChan, &batchWg, *batchSize)

	var wg sync.WaitGroup
	for w := 1; w <= *workers; w++ {
		wg.Add(1)
		go rainWorker(jobs, recordChan, &wg)
	}

	for d := startDate; !d.After(endDate); d = d.AddDate(0, 0, 1) {
		for _, s := range stations {
			jobs <- struct {
				Date    time.Time
				Station RainStation
			}{d, s}
		}
		fmt.Printf("Queued: %s\r", d.Format("2006-01-02"))
	}
	close(jobs)
	wg.Wait()
	close(recordChan)
	batchWg.Wait()

	fmt.Println("\nScraping complete.")
}

func rainLogin(username, password string) (string, error) {
	client := &http.Client{
		Timeout: 15 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	resp, err := client.Get("https://thoatnuochanoi.vn/qlnl/")
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var sess string
	for _, c := range resp.Cookies() {
		if c.Name == "ASP.NET_SessionId" {
			sess = c.Value
		}
	}

	data := fmt.Sprintf("txtuser=%s&txtpass=%s&btLogin=%%C4%%90%%C4%%83ng+nh%%E1%%BA%%ADp", username, password)
	req, _ := http.NewRequest("POST", "https://thoatnuochanoi.vn/qlnl/Login.aspx", strings.NewReader(data))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Cookie", "ASP.NET_SessionId="+sess)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36")

	resp2, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp2.Body.Close()

	if resp2.StatusCode == 302 {
		return sess, nil
	}

	return "", fmt.Errorf("login failed with status %d", resp2.StatusCode)
}

func rainBatchSaver(ch <-chan RainRecord, wg *sync.WaitGroup, batchSize int) {
	defer wg.Done()
	var batch []interface{}
	total := 0

	flush := func() {
		if len(batch) == 0 {
			return
		}
		_, err := rainCollection.InsertMany(context.Background(), batch)
		if err != nil {
			log.Printf("Batch insert error: %v", err)
		} else {
			total += len(batch)
			fmt.Printf("Inserted %d records total\r", total)
		}
		batch = []interface{}{}
	}

	for r := range ch {
		batch = append(batch, r)
		if len(batch) >= batchSize {
			flush()
		}
	}
	flush()
}

func rainWorker(jobs <-chan struct {
	Date    time.Time
	Station RainStation
}, out chan<- RainRecord, wg *sync.WaitGroup) {
	defer wg.Done()
	client := &http.Client{Timeout: 20 * time.Second}

	for j := range jobs {
		id := getRainID(j.Station.Id)
		dateStr := j.Date.Format("2006-01-02")
		url := fmt.Sprintf("https://thoatnuochanoi.vn/qlnl/Contains/ajax/phai.ashx?type=solieumua&tram=%d&ngay=%s", id, dateStr)

		req, _ := http.NewRequest("GET", url, nil)
		req.Header.Set("Accept", "application/json, text/javascript, */*; q=0.01")
		req.Header.Set("Accept-Language", "vi-VN,vi;q=0.9")
		req.Header.Set("Cache-Control", "no-cache")
		req.Header.Set("Connection", "keep-alive")
		req.Header.Set("Content-Type", "application/json; charset=utf-8")
		req.Header.Set("Cookie", "ASP.NET_SessionId="+rainSessionID)
		req.Header.Set("Pragma", "no-cache")
		req.Header.Set("Referer", "https://thoatnuochanoi.vn/qlnl/bieu-do-mua")
		req.Header.Set("User-Agent", "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36")
		req.Header.Set("X-Requested-With", "XMLHttpRequest")

		resp, err := client.Do(req)
		if err != nil {
			continue
		}
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if string(body) == "{}" || string(body) == "{\"Data\":\"[]\"}" {
			continue
		}

		var apiResponse struct {
			Data string `json:"Data"`
		}
		if err := json.Unmarshal(body, &apiResponse); err != nil {
			continue
		}

		var dataPoints []RainDataPoint
		if err := json.Unmarshal([]byte(apiResponse.Data), &dataPoints); err != nil {
			continue
		}

		for _, dp := range dataPoints {
			ts, err := time.Parse("2006-01-02T15:04:05", dp.ThoiGian)
			if err != nil {
				continue
			}
			out <- RainRecord{
				ID:          xid.New().String(),
				StationID:   id,
				StationName: j.Station.TenTram,
				Date:        ts.Format("2006-01-02"),
				Timestamp:   ts,
				Value:       dp.LuongMua,
			}
		}
	}
}

func getRainID(id interface{}) int64 {
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

func loadRainStations(filename string) []RainStation {
	data, err := os.ReadFile(filename)
	if err != nil {
		return nil
	}
	var stations []RainStation
	if err := json.Unmarshal(data, &stations); err != nil {
		return nil
	}
	return stations
}
