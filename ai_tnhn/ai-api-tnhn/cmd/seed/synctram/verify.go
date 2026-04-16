package main

import (
	"ai-api-tnhn/config"
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/bootstrap"
	"context"
	"fmt"
	"log"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load("../../../.env")
	cfg := config.LoadEnv()

	mongoDB, err := bootstrap.InitDatabase(cfg.DB)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	l := logger.NewLogger(cfg.LoggerConfig)
	repos := bootstrap.InitRepositories(mongoDB, l)

	ctx := context.Background()
	stations, _, err := repos.RainStation.List(ctx, nil)
	if err != nil {
		log.Fatalf("Error listing stations: %v", err)
	}

	for _, st := range stations {
		if st.OldID == 1 {
			fmt.Printf("Station found: %+v\n", st)
			return
		}
	}
	fmt.Println("Station with OldID 1 not found.")
}
