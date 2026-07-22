package router

import (
	"ai-api-tnhn/handler"
	"ai-api-tnhn/router/middleware"

	"github.com/gin-gonic/gin"
)

func (h HandlerFuncs) WaterRoutes(api *gin.RouterGroup, mid middleware.Middleware, waterHandler *handler.WaterHandler) {
	water := api.Group("/water")
	water.Use(mid.MidBasicType())

	water.GET("/lake/:id/history", waterHandler.GetLakeHistory)
	water.POST("/lake/:id/report", waterHandler.ReportLake)
	water.GET("/river/:id/history", waterHandler.GetRiverHistory)
	water.POST("/river/:id/report", waterHandler.ReportRiver)
	water.GET("/summary-v2", waterHandler.GetWaterSummaryV2)
	water.POST("/grid-data/batch", waterHandler.BatchUpsert)
}
