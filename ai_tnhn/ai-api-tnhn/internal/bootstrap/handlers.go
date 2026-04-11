package bootstrap

import (
	"ai-api-tnhn/config"
	"ai-api-tnhn/handler"
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/router"
	"ai-api-tnhn/router/middleware"
	"ai-api-tnhn/utils/web"

	"github.com/gin-gonic/gin"
)

func InitRouter(cfg *config.Config, s *Services, r *Repositories, log logger.Logger) *gin.Engine {
	contextWith := web.NewContextWith()

	authHandler := handler.NewAuthHandler(s.Auth, s.Token, contextWith, cfg.OAuthConfig)
	orgHandler := handler.NewOrganizationHandler(s.Organization, s.Auth, r.Role, contextWith)
	empHandler := handler.NewEmployeeHandler(s.Employee, contextWith)
	stationHandler := handler.NewStationHandler(s.Station, s.Auth, contextWith)
	inuHandler := handler.NewInundationHandler(s.Inundation, s.Auth, contextWith)
	waterHandler := handler.NewWaterHandler(s.Water)
	emConstructionHandler := handler.NewEmergencyConstructionHandler(s.EmConstruction, r.AiChatLog)
	weatherHandler := handler.NewWeatherHandler(s.Weather)
	contractCategoryHandler := handler.NewContractCategoryHandler(s.ContractCategory, s.Auth, contextWith)
	contractHandler := handler.NewContractHandler(s.Contract, s.Auth, contextWith)
	pumpingStationHandler := handler.NewPumpingStationHandler(s.PumpingStation, s.Auth, contextWith)
	permHandler := handler.NewPermissionHandler(s.Permission, contextWith)
	roleHandler := handler.NewRoleHandler(s.Role, contextWith)
	queryHandler := handler.NewQueryHandler(s.Query)
	googleHandler := handler.NewGoogleHandler(s.GoogleApi, s.Gemini, s.Drive, s.Water, s.Email, contextWith, cfg.GoogleDriveConfig, log, s.Weather, r.AiChatLog)

	mid := middleware.NewMiddleware(*cfg, r.Token, s.Permission, contextWith, log)
	handlers := router.HandlerFuncs{
		Logger:                         log,
		LoginHandler:                   authHandler.LoginHandler,
		LogoutHandler:                  authHandler.LogoutHandler,
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
		GoogleContractChatHandler:      googleHandler.ChatContract,
		GoogleChatHistoryHandler:       googleHandler.GetChatHistory,
		GoogleEmailDetailHandler:       googleHandler.GetEmailDetail,
		GoogleRecentEmailsHandler:      googleHandler.GetRecentEmails,
		GoogleUnreadEmailsHandler:      googleHandler.GetUnreadEmails,
		GenerateQuickReportHandler:     googleHandler.GenerateQuickReport,
		GenerateQuickReportV3:          googleHandler.GenerateQuickReportV3,
		GenerateQuickReportTextHandler: googleHandler.GenerateQuickReportText,
		GenerateAIDynamicReportHandler: googleHandler.GenerateAIDynamicReport,
		GetRainDataByDate:              waterHandler.GetRainDataByDate,
		DatabaseQueryHandler:           queryHandler.Query,
		GetPermissionMatrixHandler:    permHandler.GetMatrix,
		UpdatePermissionMatrixHandler: permHandler.UpdateMatrix,
		GetMyPermissionsHandler:       permHandler.GetMyPermissions,
		GetWeatherForecastHandler:     googleHandler.GetWeatherForecast,
	}

	return handlers.Create(mid, orgHandler, empHandler, stationHandler, inuHandler, waterHandler, googleHandler, queryHandler, emConstructionHandler, weatherHandler, contractCategoryHandler, contractHandler, pumpingStationHandler, permHandler, roleHandler)
}
