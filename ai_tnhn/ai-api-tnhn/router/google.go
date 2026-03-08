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
		google.POST("/quick-report", h.GenerateQuickReportHandler)
	}
}
