package cron

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sensor-backend/internal/constants"
	"sensor-backend/internal/models"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type HistoryApiResponse struct {
	Units string `json:"units"`
	Datas struct {
		Name string          `json:"name"`
		Data [][]interface{} `json:"data"`
	} `json:"datas"`
}

const (
	StatusNormal    = 0
	StatusWarning   = 1
	StatusHighAlarm = 2
)

// FetchHistoryData pulls data from link/macros for devices and writes to history_trend collection.
// minTime filters out old timestamps if provided (used for short frequent intervals).
func FetchHistoryData(ctx context.Context, database *mongo.Database, startDate, endDate string, minTime *time.Time) {
	deviceColl := database.Collection("devices")
	historyColl := database.Collection("history_trend")

	httpClient := &http.Client{
		Timeout: 60 * time.Second,
	}

	cursor, err := deviceColl.Find(ctx, bson.M{})
	if err != nil {
		log.Printf("[Cron Error] DB find devices failed: %v", err)
		return
	}
	var devices []models.Device
	if err = cursor.All(ctx, &devices); err != nil {
		log.Printf("[Cron Error] Decode devices failed: %v", err)
		return
	}

	for _, dev := range devices {
		fmt.Printf("[Fetcher] Processing device %s...\n", dev.Name)
		link := strings.TrimRight(dev.Link, "/")

		// 1. Fetch real hardware map
		mapUrl := fmt.Sprintf("%s/macros/Listnamechannel/", link)
		mapResp, err := httpClient.Post(mapUrl, "text/plain", nil)
		if err != nil {
			fmt.Printf("     [Error] Failed to fetch Listnamechannel: %v\n", err)
			continue
		}

		scanner := bufio.NewScanner(mapResp.Body)
		hwMap := make(map[string]int)
		lineIdx := 0
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line != "" {
				hwMap[strings.ToLower(line)] = lineIdx
				lineIdx++
			}
		}
		mapResp.Body.Close()

		// 2. Fetch history for each configured sensor type
		for sType, sLabel := range constants.SensorLabels {
			hwID := -1
			for hwName, hId := range hwMap {
				if strings.Contains(hwName, strings.ToLower(sLabel)) {
					hwID = hId
					break
				}
			}

			if hwID == -1 {
				continue
			}

			var cItem *models.DeviceConfig
			for i, cfg := range dev.Config {
				if strings.Contains(strings.ToLower(cfg.Code), strings.ToLower(sLabel)) {
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

			apiUrl := fmt.Sprintf("%s/macros/load_history_date_channel/%d,%s,%s", link, hwID, startDate, endDate)
			resp, err := httpClient.Post(apiUrl, "application/json", nil)
			if err != nil {
				fmt.Printf("     [Error] POST request failed: %v\n", err)
				continue
			}

			var apiResp HistoryApiResponse
			if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
				fmt.Printf("     [Error] Decode JSON failed (maybe empty?): %v\n", err)
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

				// Skip if older than minTime
				if minTime != nil && ts.Before(*minTime) {
					continue
				}

				status := StatusNormal
				if highSet > 0 || warnSet > 0 {
					if highSet > 0 && valRaw >= highSet {
						status = StatusHighAlarm
					} else if warnSet > 0 && valRaw >= warnSet {
						status = StatusWarning
					}
				}

				doc := models.HistoryTrend{
					DeviceLink:   dev.Link,
					DeviceIP:     dev.IP,
					Code:         sLabel,
					SensorType:   int(sType),
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

				model := mongo.NewUpdateOneModel().SetFilter(filter).SetUpdate(update).SetUpsert(true)
				operations = append(operations, model)

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

			if minTime == nil {
				fmt.Printf("     -> Channel %s: Processed ~%d records.\n", sLabel, totalProcessed)
			}
			time.Sleep(500 * time.Millisecond) // reduce stress on device
		}
	}
	if minTime == nil {
		fmt.Println("[Fetcher] Data Fetching Completed!")
	}
}
