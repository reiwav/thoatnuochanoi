package router

import (
	"ai-api-tnhn/constant"
	"ai-api-tnhn/handler"
	"ai-api-tnhn/router/middleware"

	"github.com/gin-gonic/gin"
)

func (h HandlerFuncs) GoogleRoutes(api *gin.RouterGroup, mid middleware.Middleware, googleHandler *handler.GoogleHandler) {
	google := api.Group("/google")
	google.Use(mid.MidBasicType())
	{
		google.GET("/status", googleHandler.GetStatus)
		google.GET("/rain-summary", mid.Authorize(constant.PERM_AI_SYNTHESIS), googleHandler.GetRainSummary)
		google.GET("/water-summary", mid.Authorize(constant.PERM_AI_SYNTHESIS), googleHandler.GetWaterSummary)
		google.GET("/inundation-summary", mid.Authorize(constant.PERM_AI_SYNTHESIS), googleHandler.GetInundationSummary)
		google.POST("/chat", mid.Authorize(constant.PERM_AI_CHAT), googleHandler.Chat)
		google.GET("/chat/history", mid.Authorize(constant.PERM_AI_CHAT), googleHandler.GetChatHistory)
		google.POST("/contract-chat", mid.Authorize(constant.PERM_AI_CHAT), googleHandler.ChatContract)
		google.GET("/email/:id", mid.Authorize(constant.PERM_AI_CHAT), googleHandler.GetEmailDetail)
		google.GET("/emails/recent", mid.Authorize(constant.PERM_AI_CHAT), googleHandler.GetRecentEmails)
		google.GET("/emails/unread", mid.Authorize(constant.PERM_AI_CHAT), googleHandler.GetUnreadEmails)
		google.POST("/quick-report", mid.Authorize(constant.PERM_AI_REPORT), googleHandler.GenerateQuickReportV3)
		google.POST("/quick-report-text", mid.Authorize(constant.PERM_AI_REPORT), googleHandler.GenerateQuickReportText)
		google.POST("/dynamic-report", mid.Authorize(constant.PERM_AI_POST_RAIN), googleHandler.GenerateAIDynamicReport)
		google.GET("/weather/forecast", googleHandler.GetWeatherForecast)
	}
}
