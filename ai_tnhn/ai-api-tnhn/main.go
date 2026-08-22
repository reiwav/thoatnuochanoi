package main

import (
	"ai-api-tnhn/config"
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/bootstrap"
	"fmt"

	"ai-api-tnhn/pkg/machineid"

	"os"

	"github.com/joho/godotenv"
)

// AllowedMachineIDs danh sách các Machine ID được phép chạy ứng dụng
var AllowedMachineIDs = []string{
	"94BD-D81C-1028-8DCD", // Máy Mac (Local Dev)
	"7968-E9E2-7CED-976D", // Máy chủ Linux VPS (Production)
}

// @title API Hệ thống
// @version 1.0
// @description Máy chủ API cho Hệ thống.
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.url http://www.swagger.io/support
// @contact.email support@swagger.io

// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html

// @host localhost:8089
// @BasePath /api
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization

func main() {
	// 0. Kiểm tra bản quyền theo Machine ID
	valid, _, err := machineid.Validate(AllowedMachineIDs...)
	if err != nil || !valid {
		fmt.Println("==================================================")

		fmt.Println("==================================================")
		os.Exit(1)
	}

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
