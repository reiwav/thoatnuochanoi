package router

import (
	"ai-api-tnhn/internal/base/logger"

	"github.com/gin-gonic/gin"
)

type HandlerFuncs struct {
	logger.Logger
	GetProfileHandler              gin.HandlerFunc
	UpdateProfileHandler           gin.HandlerFunc
	ChangePasswordHandler          gin.HandlerFunc
	LoginHandler                   gin.HandlerFunc
	LogoutHandler                  gin.HandlerFunc
	GoogleLoginHandler             gin.HandlerFunc
	GoogleCallbackHandler          gin.HandlerFunc
	GoogleStatusHandler            gin.HandlerFunc
	GoogleRainSummaryHandler       gin.HandlerFunc
	GoogleWaterSummaryHandler      gin.HandlerFunc
	GoogleInundationSummaryHandler gin.HandlerFunc
	GoogleChatHandler              gin.HandlerFunc
	GoogleContractChatHandler      gin.HandlerFunc
	GoogleEmailDetailHandler       gin.HandlerFunc
	GoogleRecentEmailsHandler      gin.HandlerFunc
	GoogleUnreadEmailsHandler      gin.HandlerFunc
	GenerateQuickReportHandler     gin.HandlerFunc
	GenerateQuickReportV3          gin.HandlerFunc
	GenerateQuickReportTextHandler gin.HandlerFunc
	GenerateAIDynamicReportHandler gin.HandlerFunc
	GetRainDataByDate              gin.HandlerFunc
	DatabaseQueryHandler           gin.HandlerFunc
}
