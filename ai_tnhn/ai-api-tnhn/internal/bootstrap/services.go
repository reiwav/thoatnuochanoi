package bootstrap

import (
	"ai-api-tnhn/config"
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/base/mgo/db"
	"ai-api-tnhn/internal/service/auth"
	"ai-api-tnhn/internal/service/contract"
	"ai-api-tnhn/internal/service/contract_category"
	"ai-api-tnhn/internal/service/email"
	"ai-api-tnhn/internal/service/emergency_construction"
	"ai-api-tnhn/internal/service/employee"
	"ai-api-tnhn/internal/service/gemini"
	"ai-api-tnhn/internal/service/googleapi"
	"ai-api-tnhn/internal/service/googledrive"
	"ai-api-tnhn/internal/service/inundation"
	"ai-api-tnhn/internal/service/organization"
	"ai-api-tnhn/internal/service/permission"
	"ai-api-tnhn/internal/service/pump"
	pumpingstation "ai-api-tnhn/internal/service/pumping_station"
	"ai-api-tnhn/internal/service/query"
	"ai-api-tnhn/internal/service/role"
	"ai-api-tnhn/internal/service/station"
	"ai-api-tnhn/internal/service/stationdata"
	"ai-api-tnhn/internal/service/storage"
	"ai-api-tnhn/internal/service/telegram"
	"ai-api-tnhn/internal/service/token"
	"ai-api-tnhn/internal/service/water"
	"ai-api-tnhn/internal/service/weather"
	"context"
)

type Services struct {
	Token             token.Service
	Auth              auth.Service
	Organization      organization.Service
	Employee          employee.Service
	Water             water.Service
	Email             email.Service
	Station           station.Service
	Inundation        inundation.Service
	Weather           weather.Service
	GoogleApi         googleapi.Service
	EmConstruction    emergency_construction.Service
	ContractCategory  contract_category.Service
	Contract          contract.Service
	PumpingStation    pumpingstation.Service
	Permission        permission.Service
	Role              role.Service
	Query             query.Service
	StationData       stationdata.Service
	Gemini            gemini.Service
	Telegram          telegram.BotTele
	Drive             googledrive.Service
	Storage           storage.Service
}

func InitServices(cfg *config.Config, repos *Repositories, db *db.Mongo, log logger.Logger) *Services {
	teleBot, _ := telegram.NewBot(cfg.TelegramConfig.TeleToken)
	if teleBot != nil {
		log.GetLogger().Info("Telegram bot initialized")
	}

	driveService, _ := googledrive.NewService(cfg.GoogleDriveConfig, cfg.OAuthConfig)

	var storageSvc storage.Service
	if cfg.StorageType == "local" {
		storageSvc, _ = storage.NewLocalService(cfg.LocalStoragePath)
		log.GetLogger().Infof("Using local storage at: %s", cfg.LocalStoragePath)
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

	s := &Services{
		Telegram: teleBot,
		Drive:    driveService,
		Storage:  storageSvc,
	}

	s.Token = token.NewService(repos.Token)
	s.Auth = auth.NewService(repos.Token, repos.User, repos.Role)
	s.Organization = organization.NewService(repos.Organization, repos.User, driveService)
	s.Employee = employee.NewService(repos.User, repos.Organization, repos.Role, driveService)
	s.Water = water.NewService(repos.Rain, repos.Lake, repos.River)
	s.Email = email.NewService(cfg.EmailConfig)
	s.Station = station.NewService(repos.RainStation, repos.LakeStation, repos.RiverStation, repos.Organization)
	s.Inundation = inundation.NewService(repos.Inundation, repos.InundationUpdate, repos.InundationPoint, repos.Organization, driveService)
	s.Weather = weather.NewService(repos.HistoricalRain)

	s.GoogleApi, _ = googleapi.NewService(cfg.GoogleDriveConfig, cfg.OAuthConfig, repos.AiUsage, s.Inundation, s.Weather)
	if s.GoogleApi != nil {
		s.GoogleApi.SetEmailService(s.Email)
	}

	s.EmConstruction = emergency_construction.NewService(repos.EmergencyConstruction, repos.EmergencyConstructionHistory, repos.EmergencyConstructionProgress, repos.User, repos.Organization, driveService)
	s.ContractCategory = contract_category.NewService(repos.ContractCategory, driveService)
	s.Contract = contract.NewService(repos.Contract, repos.ContractCategory, repos.Organization, driveService)
	s.PumpingStation = pumpingstation.NewService(repos.PumpingStation, repos.User, repos.Organization)
	s.Permission = permission.NewService(repos.Permission, repos.RolePermission)
	s.Role = role.NewService(repos.Role)

	pumpWorker := pump.NewWorker(log, s.PumpingStation)
	s.PumpingStation.SetWorker(pumpWorker)
	pumpWorker.Start(context.Background())

	s.Query = query.NewService(db.DB)
	s.StationData = stationdata.NewService(s.Station, s.Water)
	s.Gemini, _ = gemini.NewService(cfg.GeminiAPIKey, cfg.GeminiAPIKeyContract, s.Water, s.GoogleApi, s.Inundation, s.Query, s.StationData, s.EmConstruction, s.Contract, s.Station, repos.AiUsage, repos.AiChatLog, repos.User)

	if s.Gemini != nil {
		targetWeatherSvc := s.Gemini
		if cfg.GeminiAPIKeyWeather != "" {
			weatherGeminiSvc, err := gemini.NewService(cfg.GeminiAPIKeyWeather, cfg.GeminiAPIKeyWeather, s.Water, s.GoogleApi, s.Inundation, s.Query, s.StationData, s.EmConstruction, s.Contract, s.Station, repos.AiUsage, repos.AiChatLog, repos.User)
			if err == nil {
				targetWeatherSvc = weatherGeminiSvc
			}
		}
		if s.Weather != nil {
			s.Weather.SetForecastFunc(func(ctx context.Context, prompt string) (string, error) {
				return targetWeatherSvc.Chat(ctx, prompt, nil, "system_weather", "SKIP_LOG")
			})
		}
	}

	return s
}

func (s *Services) PostInit(log logger.Logger, repos *Repositories) {
	if s.Drive != nil {
		go func() {
			log.GetLogger().Info("Starting automated Google Drive storage initialization for all organizations...")
			ctx := context.Background()
			orgs, _, err := s.Organization.FindAll(ctx, 1, 1000)
			if err != nil {
				log.GetLogger().Errorf("Failed to fetch organizations for drive init: %v", err)
				return
			}

			for _, org := range orgs {
				folderID, err := s.Drive.InitOrgFolders(ctx, org.Name)
				if err != nil {
					log.GetLogger().Errorf("Failed to init folders for org %s: %v", org.Name, err)
					continue
				}

				if org.DriveFolderID != folderID {
					err = repos.Organization.UpdateDriveFolderID(ctx, org.ID, folderID)
					if err != nil {
						log.GetLogger().Errorf("Failed to update DriveFolderID in DB for org %s: %v", org.Name, err)
					} else {
						log.GetLogger().Infof("Successfully initialized and synced Drive folders for org: %s", org.Name)
					}
				}
			}
			log.GetLogger().Info("Google Drive automated storage initialization complete.")
		}()
	}
}
