package main

import (
	"context"
	"fmt"
	"log"
	"sensor-backend/config"
	"sensor-backend/handler"
	"sensor-backend/internal/cron"
	"sensor-backend/internal/db"
	"sensor-backend/internal/repository/mongo"
	"sensor-backend/internal/service/auth"
	"sensor-backend/internal/service/device"
	"sensor-backend/internal/service/sensor"
	"sensor-backend/router"
	"time"
)

func main() {
	cfg := config.LoadConfig()

	// DB Setup
	database, err := db.ConnectMongo(cfg)
	if err != nil {
		log.Fatal("Could not connect to MongoDB:", err)
	}
	fmt.Println("Connected to MongoDB!")

	// Repositories
	userRepo := mongo.NewUserRepo(database)
	deviceRepo := mongo.NewDeviceRepo(database)

	// Services
	authSvc := auth.NewService(userRepo, cfg.JWTSecret)
	sensorSvc := sensor.NewService(database)
	deviceSvc := device.NewService(deviceRepo)

	// Load Device Cache
	if err := deviceSvc.LoadCache(context.Background()); err != nil {
		log.Printf("Warning: Could not load device cache: %v", err)
	}

	// Seed data
	authSvc.SeedAdmin(context.Background())


	// Handlers
	authH := handler.NewAuthHandler(authSvc)
	sensorH := handler.NewSensorHandler(sensorSvc)
	deviceH := handler.NewDeviceHandler(deviceSvc)

	// Router
	r := router.NewRouter(authH, sensorH, deviceH)

	// Start 5-minute Cron job for fetching recent history
	go func() {
		log.Println("[Cron] Starting background fetcher (5 min interval, last 10 mins data)...")
		ticker := time.NewTicker(5 * time.Minute)
		ctxCron := context.Background()

		// Run once immediately on start:
		func() {
			now := time.Now()
			dateStr := now.Format("2006-01-02")
			minTime := now.Add(-10 * time.Minute)
			cron.FetchHistoryData(ctxCron, database, dateStr, dateStr, &minTime)
		}()

		for range ticker.C {
			now := time.Now()
			dateStr := now.Format("2006-01-02")
			minTime := now.Add(-10 * time.Minute)
			cron.FetchHistoryData(ctxCron, database, dateStr, dateStr, &minTime)
		}
	}()

	fmt.Printf("Backend running on %s\n", cfg.Port)
	r.Run(cfg.Port)
}
