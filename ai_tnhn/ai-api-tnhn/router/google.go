package router

import (
	"ai-api-tnhn/handler"
	"ai-api-tnhn/router/middleware"

	"github.com/gin-gonic/gin"
)

func (h HandlerFuncs) GoogleRoutes(api *gin.RouterGroup, mid middleware.Middleware, googleHandler *handler.GoogleHandler) {
	google := api.Group("/google")
	google.Use(mid.MidBasicType())
	{
		google.GET("/status", h.GoogleStatusHandler)
		google.GET("/rain-summary", h.GoogleRainSummaryHandler)
		google.GET("/water-summary", h.GoogleWaterSummaryHandler)
		google.GET("/inundation-summary", h.GoogleInundationSummaryHandler)
		google.POST("/chat", h.GoogleChatHandler)
		google.GET("/chat/history", h.GoogleChatHistoryHandler)
		google.POST("/contract-chat", mid.MidBasicType(), h.GoogleContractChatHandler)
		google.GET("/email/:id", h.GoogleEmailDetailHandler)
		google.GET("/emails/recent", h.GoogleRecentEmailsHandler)
		google.GET("/emails/unread", h.GoogleUnreadEmailsHandler)
		google.POST("/quick-report", h.GenerateQuickReportV3)
		google.POST("/quick-report-text", h.GenerateQuickReportTextHandler)
		google.POST("/dynamic-report", h.GenerateAIDynamicReportHandler)
	}
}
