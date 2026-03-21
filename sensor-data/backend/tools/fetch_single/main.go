package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sensor-backend/config"
	"sensor-backend/internal/constants"
	"sensor-backend/internal/cron"
	"sensor-backend/internal/db"
	"sensor-backend/internal/models"
	"strconv"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

func main() {
	if len(os.Args) < 5 {
		fmt.Println("Usage: go run tools/fetch_single/main.go <link> <channelID> <startDate> <endDate>")
		fmt.Println("Example: go run tools/fetch_single/main.go http://14.224.214.119:8880 1 2026-03-08 2026-03-10")
		return
	}

	link := strings.TrimRight(os.Args[1], "/")
	hwID, err := strconv.Atoi(os.Args[2])
	if err != nil {
		log.Fatal("Invalid channelID (must be integer)")
	}
	startDate := os.Args[3]
	endDate := os.Args[4]

	cfg := config.LoadConfig()
	database, err := db.ConnectMongo(cfg)
	if err != nil {
		log.Fatal(err)
	}

	ctx := context.Background()
	deviceColl := database.Collection("devices")
	historyColl := database.Collection("history_trend")
	httpClient := &http.Client{Timeout: 60 * time.Second}

	// 1. Get device from DB
	var dev models.Device
	err = deviceColl.FindOne(ctx, bson.M{"link": bson.M{"$regex": link}}).Decode(&dev)
	if err != nil {
		fmt.Printf("Device with link %s not found in DB or error: %v\n", link, err)
		return
	}

	// 2. Fetch hardware map to resolve channel name
	mapUrl := fmt.Sprintf("%s/macros/Listnamechannel/", link)
	mapResp, err := httpClient.Post(mapUrl, "text/plain", nil)
	if err != nil {
		log.Fatalf("Failed to fetch Listnamechannel: %v", err)
	}
	defer mapResp.Body.Close()

	scanner := bufio.NewScanner(mapResp.Body)
	var hwName string
	lineIdx := 0
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line != "" {
			if lineIdx == hwID {
				hwName = strings.ToLower(line)
			}
			lineIdx++
		}
	}

	if hwName == "" {
		log.Fatalf("Channel ID %d not found in hardware map", hwID)
	}

	// 3. Find matching sensor type and DB config
	var targetType int
	var targetLabel string
	for sType, sLabel := range constants.SensorLabels {
		if strings.Contains(hwName, strings.ToLower(sLabel)) {
			targetType = int(sType)
			targetLabel = sLabel
			break
		}
	}

	if targetLabel == "" {
		log.Fatalf("Hardware name '%s' does not match any known sensor label in DB. Cannot insert.", hwName)
	}

	var cItem *models.DeviceConfig
	for i, c := range dev.Config {
		if strings.Contains(strings.ToLower(c.Code), strings.ToLower(targetLabel)) {
			cItem = &dev.Config[i]
			break
		}
	}

	warnSet := 0.0
	highSet := 0.0
	if cItem != nil {
		warnSet = cItem.WarningSet
		highSet = cItem.HighAlarmSet
	}

	fmt.Printf("[FetchSingle] Device: %s | Hardware: %s -> DB Label: %s | Channel ID: %d\n", dev.Name, hwName, targetLabel, hwID)

	tStart, err := time.Parse("2006-01-02", startDate)
	tEnd, err2 := time.Parse("2006-01-02", endDate)
	if err != nil || err2 != nil {
		log.Fatal("Invalid date format")
	}

	for d := tStart; !d.After(tEnd); d = d.AddDate(0, 0, 3) {
		chunkEnd := d.AddDate(0, 0, 2)
		if chunkEnd.After(tEnd) {
			chunkEnd = tEnd
		}

		currentDateStr := d.Format("2006-01-02")
		chunkEndStr := chunkEnd.Format("2006-01-02")

		fmt.Printf("   => Fetching Date %s to %s...\n", currentDateStr, chunkEndStr)

		apiUrl := fmt.Sprintf("%s/macros/load_history_date_channel/%d,%s,%s", link, hwID, currentDateStr, chunkEndStr)
		resp, err := httpClient.Post(apiUrl, "application/json", nil)
		if err != nil {
			fmt.Printf("     [Error] POST request failed: %v\n", err)
			continue
		}

		var apiResp cron.HistoryApiResponse
		if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
			fmt.Printf("     [Warn] Decode JSON failed (maybe empty)\n")
			resp.Body.Close()
			continue
		}
		resp.Body.Close()

		var operations []mongo.WriteModel
		const BatchSize = 1000
		totalProcessed := 0

		for _, p := range apiResp.Datas.Data {
			if len(p) < 2 {
				continue
			}

			tsRaw, ok1 := p[0].(float64)
			valRaw, ok2 := p[1].(float64)
			if !ok1 || !ok2 {
				continue
			}

			msec := int64(tsRaw) - 25200000
			ts := time.UnixMilli(msec)

			status := cron.StatusNormal
			if highSet > 0 || warnSet > 0 {
				if highSet > 0 && valRaw >= highSet {
					status = cron.StatusHighAlarm
				} else if warnSet > 0 && valRaw >= warnSet {
					status = cron.StatusWarning
				}
			}

			doc := models.HistoryTrend{
				DeviceLink:   dev.Link,
				DeviceIP:     dev.IP,
				Code:         targetLabel,
				SensorType:   targetType,
				Timestamp:    ts,
				Value:        valRaw,
				WarningSet:   warnSet,
				HighAlarmSet: highSet,
				Status:       status,
			}

			filter := bson.M{
				"device_link": doc.DeviceLink,
				"code":        doc.Code,
				"sensor_type": doc.SensorType,
				"timestamp":   doc.Timestamp,
			}
			update := bson.M{
				"$set": doc,
			}

			operations = append(operations, mongo.NewUpdateOneModel().SetFilter(filter).SetUpdate(update).SetUpsert(true))

			if len(operations) >= BatchSize {
				res, err := historyColl.BulkWrite(ctx, operations)
				if err != nil {
					fmt.Printf("     [Error] BulkWrite failed: %v\n", err)
				} else {
					totalProcessed += int(res.UpsertedCount + res.ModifiedCount)
				}
				operations = nil
			}
		}

		if len(operations) > 0 {
			res, err := historyColl.BulkWrite(ctx, operations)
			if err != nil {
				fmt.Printf("     [Error] Final BulkWrite failed: %v\n", err)
			} else {
				totalProcessed += int(res.UpsertedCount + res.ModifiedCount)
			}
		}

		fmt.Printf("       -> Processed ~%d records.\n", totalProcessed)
		time.Sleep(5 * time.Second)
	}
	fmt.Println("Completed single channel fetch!")
}
