package main

import (
	"ai-api-tnhn/config"
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/bootstrap"

	"github.com/joho/godotenv"
)

// @title API Hệ thống Giám sát Ngập lụt Hà Nội
// @version 1.0
// @description Máy chủ API cho Hệ thống Giám sát Ngập lụt Hà Nội.
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.url http://www.swagger.io/support
// @contact.email support@swagger.io

// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html

// @host localhost:8080
// @BasePath /api
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization

func main() {
	_ = godotenv.Load()
	cfg := config.LoadEnv()
	log := logger.NewLogger(cfg.LoggerConfig)

	// 1. Initialize Database
	db, err := bootstrap.InitDatabase(cfg.DB)
	if err != nil {
		panic(err)
	}

	// 2. Initialize Repositories
	repos := bootstrap.InitRepositories(db, log)

	// 3. Initialize Services
	services := bootstrap.InitServices(&cfg, repos, db, log)

	// 4. Initialize Handlers and Router
	r := bootstrap.InitRouter(&cfg, services, repos, log)

	// 5. Post-Initialization (Google Drive automation, etc.)
	services.PostInit(log, repos)

	// 6. Run Server
	r.Run(cfg.Port)
}
