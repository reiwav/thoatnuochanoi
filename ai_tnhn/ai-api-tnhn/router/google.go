package router

import (
	"ai-api-tnhn/handler/google"
	"ai-api-tnhn/router/middleware"

	"github.com/gin-gonic/gin"
)

func (h HandlerFuncs) GoogleRoutes(api *gin.RouterGroup, mid middleware.Middleware, googleHandler google.Handler) {
	google := api.Group("/google")
	google.Use(mid.MidBasicType())
	{
		google.GET("/status", googleHandler.GetStatus)
		google.GET("/rain-summary", googleHandler.GetRainSummary)
		google.GET("/rain-summary-text", googleHandler.GetRainSummaryText)
		google.GET("/water-summary", googleHandler.GetWaterSummary)
		google.GET("/inundation-summary", googleHandler.GetInundationSummary)
		google.POST("/chat", googleHandler.Chat)
		google.GET("/chat/history", googleHandler.GetChatHistory)
		google.POST("/contract-chat", googleHandler.ChatContract)
		google.GET("/email/:id", googleHandler.GetEmailDetail)
		google.GET("/emails/recent", googleHandler.GetRecentEmails)
		google.GET("/emails/unread", googleHandler.GetUnreadEmails)
		google.POST("/quick-report", googleHandler.GenerateQuickReportV3)
		google.POST("/quick-report-text", googleHandler.GenerateQuickReportText)
		google.POST("/dynamic-report", googleHandler.GenerateAIDynamicReport)
		google.GET("/weather/forecast", googleHandler.GetWeatherForecast)
		google.GET("/weather/forecast/gemini", googleHandler.GetGeminiWeatherForecast)
	}
}
