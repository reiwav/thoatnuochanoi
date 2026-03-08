package router

import (
	"ai-api-tnhn/handler"
	"ai-api-tnhn/router/middleware"

	"github.com/gin-gonic/gin"
)

func (h HandlerFuncs) WaterRoutes(api *gin.RouterGroup, mid middleware.Middleware, waterHandler *handler.WaterHandler) {
	water := api.Group("/water")
	water.Use(mid.MidBasicType())

	water.GET("/rain/:id/history", waterHandler.GetRainHistory)
	water.GET("/lake/:id/history", waterHandler.GetLakeHistory)
	water.GET("/river/:id/history", waterHandler.GetRiverHistory)
	water.GET("/rain/by-date", waterHandler.GetRainDataByDate)
}
