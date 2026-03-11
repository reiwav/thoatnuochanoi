package main

import (
	"ai-api-tnhn/config"
	"ai-api-tnhn/handler"
	"ai-api-tnhn/internal/base/index"
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/base/mgo/db"
	"ai-api-tnhn/internal/repository/query"
	"ai-api-tnhn/internal/service/auth"
	"ai-api-tnhn/internal/service/email"
	"ai-api-tnhn/internal/service/emergency_construction"
	"ai-api-tnhn/internal/service/employee"
	"ai-api-tnhn/internal/service/gemini"
	"ai-api-tnhn/internal/service/googleapi"
	"ai-api-tnhn/internal/service/googledrive"
	"ai-api-tnhn/internal/service/inundation"
	"ai-api-tnhn/internal/service/organization"
	querysvc "ai-api-tnhn/internal/service/query"
	"ai-api-tnhn/internal/service/station"
	"ai-api-tnhn/internal/service/stationdata"
	"ai-api-tnhn/internal/service/storage"
	"ai-api-tnhn/internal/service/telegram"
	"ai-api-tnhn/internal/service/token"
	"ai-api-tnhn/internal/service/water"
	"ai-api-tnhn/internal/service/weather"
	"ai-api-tnhn/router"
	"ai-api-tnhn/router/middleware"
	"ai-api-tnhn/utils/web"
	"context"
)

func main() {
	var confg = config.LoadEnv()
	log := logger.NewLogger(confg.LoggerConfig)

	var db, err = db.ConnectMongo(confg.DB)
	if err != nil {
		panic(err)
	}

	tokenRepo := query.NewTokenRepo(db.DB, "tokens", "tk", log)
	userRepo := query.NewUserRepo(db.DB, "users", "usr", log)
	orgRepo := query.NewOrganizationRepository(db.DB, "organizations", "org", log)
	rainRepo := query.NewRainRepo(db.DB, "rain_records", "rain", log)
	lakeRepo := query.NewLakeRepo(db.DB, "lake_records", "lake", log)
	riverRepo := query.NewRiverRepo(db.DB, "river_records", "river", log)
	inuRepo := query.NewInundationRepository(db.DB, "inundation_reports", "inu", log)
	inuUpdateRepo := query.NewInundationUpdateRepository(db.DB, "inundation_updates", "inuup", log)
	inuPointRepo := query.NewInundationPointRepository(db.DB, "inundation_stations", "inpt", log)
	aiUsageRepo := query.NewAiUsageRepo(db.DB, "ai_usage_records", "aiu", log)
	emConstructionRepo := query.NewEmergencyConstructionRepository(db.DB, "emergency_constructions", "emc", log)
	emConstructionHistoryRepo := query.NewEmergencyConstructionHistoryRepository(db.DB, "emergency_construction_histories", "emch", log)
	emConstructionProgressRepo := query.NewEmergencyConstructionProgressRepository(db.DB, "emergency_construction_progress", "emcp", log)

	rainStationRepo := query.NewRainStationRepo(db.DB, "rain_stations", "rst", log)
	lakeStationRepo := query.NewLakeStationRepo(db.DB, "lake_stations", "lst", log)
	riverStationRepo := query.NewRiverStationRepo(db.DB, "river_stations", "rvst", log)
	historicalRainRepo := query.NewHistoricalRainRepo(db.DB, "historical_rain_records", "hrr", log)

	index.InitMongoSchema(context.Background(), db.DB)

	teleBot, _ := telegram.NewBot(confg.TelegramConfig.TeleToken)
	if teleBot != nil {
		log.GetLogger().Info("Telegram bot initialized")
	}

	driveService, _ := googledrive.NewService(confg.GoogleDriveConfig, confg.OAuthConfig)

	// Storage Selection
	var storageSvc storage.Service
	if confg.StorageType == "local" {
		storageSvc, _ = storage.NewLocalService(confg.LocalStoragePath)
		log.GetLogger().Infof("Using local storage at: %s", confg.LocalStoragePath)
	} else {
		storageSvc = driveService
		log.GetLogger().Info("Using Google Drive storage")
	}

	if storageSvc != nil {
		driveService = googledrive.NewStorageWrapper(storageSvc, driveService)
	}

	if driveService != nil {
		log.GetLogger().Info("Drive/Storage service initialized")
	}

	tokenService := token.NewService(tokenRepo)
	authService := auth.NewService(tokenRepo, userRepo)
	orgService := organization.NewService(orgRepo, userRepo, driveService)
	empService := employee.NewService(userRepo, orgRepo, driveService)
	waterService := water.NewService(rainRepo, lakeRepo, riverRepo)
	emailService := email.NewService(confg.EmailConfig)
	stationService := station.NewService(rainStationRepo, lakeStationRepo, riverStationRepo)
	inuService := inundation.NewService(inuRepo, inuUpdateRepo, inuPointRepo, orgRepo, driveService)
	weatherService := weather.NewService(historicalRainRepo)
	googleApiService, _ := googleapi.NewService(confg.GoogleDriveConfig, confg.OAuthConfig, aiUsageRepo, inuService, weatherService)
	if googleApiService != nil {
		googleApiService.SetEmailService(emailService)
	}
	emConstructionService := emergency_construction.NewService(emConstructionRepo, emConstructionHistoryRepo, emConstructionProgressRepo, userRepo, orgRepo)
	queryService := querysvc.NewService(db.DB)
	queryHandler := handler.NewQueryHandler(queryService)
	stationDataService := stationdata.NewService(stationService, waterService)
	geminiService, err := gemini.NewService(confg.GeminiAPIKey, waterService, googleApiService, inuService, queryService, stationDataService, emConstructionService, aiUsageRepo)
	if err != nil {
		log.GetLogger().Errorf("Failed to initialize Gemini service: %v", err)
	} else {
		log.GetLogger().Info("Gemini AI service initialized successfully")
	}

	// Initialize Google Drive Storage for all Organizations
	if driveService != nil {
		go func() {
			log.GetLogger().Info("Starting automated Google Drive storage initialization for all organizations...")
			ctx := context.Background()
			orgs, _, err := orgService.FindAll(ctx, 1, 1000) // Assuming max 1000 orgs for now
			if err != nil {
				log.GetLogger().Errorf("Failed to fetch organizations for drive init: %v", err)
				return
			}

			for _, org := range orgs {
				folderID, err := driveService.InitOrgFolders(ctx, org.Name)
				if err != nil {
					log.GetLogger().Errorf("Failed to init folders for org %s: %v", org.Name, err)
					continue
				}

				if org.DriveFolderID != folderID {
					// Update DB to sync the new Folder ID
					err = orgRepo.UpdateDriveFolderID(ctx, org.ID, folderID)
					if err != nil {
						log.GetLogger().Errorf("Failed to update DriveFolderID in DB for org %s: %v", org.Name, err)
					} else {
						log.GetLogger().Infof("Successfully initialized and synced Drive folders for org: %s", org.Name)
					}
				} else {
					log.GetLogger().Infof("Drive folders already up-to-date for org: %s", org.Name)
				}
			}
			log.GetLogger().Info("Google Drive automated storage initialization complete.")
		}()
	}

	if waterService != nil {
		log.GetLogger().Info("Water service initialized")
	}

	contextWith := web.NewContextWith()

	authHandler := handler.NewAuthHandler(authService, tokenService, contextWith, confg.OAuthConfig)
	orgHandler := handler.NewOrganizationHandler(orgService)
	empHandler := handler.NewEmployeeHandler(empService, contextWith)
	stationHandler := handler.NewStationHandler(stationService)
	inuHandler := handler.NewInundationHandler(inuService, authService, contextWith)
	waterHandler := handler.NewWaterHandler(waterService)
	emConstructionHandler := handler.NewEmergencyConstructionHandler(emConstructionService)
	weatherHandler := handler.NewWeatherHandler(weatherService)
	googleHandler := handler.NewGoogleHandler(googleApiService, geminiService, driveService, waterService, emailService, contextWith, confg.GoogleDriveConfig, log)
	mid := middleware.NewMiddleware(confg, tokenRepo, contextWith, log)
	handlers := router.HandlerFuncs{
		Logger:                         log,
		LoginHandler:                   authHandler.LoginHandler,
		LogoutHandler:                  authHandler.LogoutHandler,
		EmployeeLoginHandler:           authHandler.EmployeeLoginHandler,
		GoogleLoginHandler:             authHandler.GoogleLoginHandler,
		GoogleCallbackHandler:          authHandler.GoogleCallbackHandler,
		GetProfileHandler:              authHandler.GetProfileHandler,
		UpdateProfileHandler:           authHandler.UpdateProfileHandler,
		ChangePasswordHandler:          authHandler.ChangePasswordHandler,
		GoogleStatusHandler:            googleHandler.GetStatus,
		GoogleRainSummaryHandler:       googleHandler.GetRainSummary,
		GoogleWaterSummaryHandler:      googleHandler.GetWaterSummary,
		GoogleInundationSummaryHandler: googleHandler.GetInundationSummary,
		GoogleChatHandler:              googleHandler.Chat,
		GoogleEmailDetailHandler:       googleHandler.GetEmailDetail,
		GoogleRecentEmailsHandler:      googleHandler.GetRecentEmails,
		GoogleUnreadEmailsHandler:      googleHandler.GetUnreadEmails,
		GenerateQuickReportHandler:     googleHandler.GenerateQuickReport,
		GetRainDataByDate:              waterHandler.GetRainDataByDate,
		DatabaseQueryHandler:           queryHandler.Query,
	}

	r := handlers.Create(mid, orgHandler, empHandler, stationHandler, inuHandler, waterHandler, googleHandler, queryHandler, emConstructionHandler, weatherHandler)
	r.Run(confg.Port)
}
