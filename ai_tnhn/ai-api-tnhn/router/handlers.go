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
	EmployeeLoginHandler           gin.HandlerFunc
	GoogleLoginHandler             gin.HandlerFunc
	GoogleCallbackHandler          gin.HandlerFunc
	GoogleStatusHandler            gin.HandlerFunc
	GoogleRainSummaryHandler       gin.HandlerFunc
	GoogleWaterSummaryHandler      gin.HandlerFunc
	GoogleInundationSummaryHandler gin.HandlerFunc
	GoogleChatHandler              gin.HandlerFunc
	GoogleEmailDetailHandler       gin.HandlerFunc
	GenerateQuickReportHandler     gin.HandlerFunc
	GetRainDataByDate              gin.HandlerFunc
	DatabaseQueryHandler           gin.HandlerFunc
}
