package router

import (
	"ai-api-tnhn/handler"
	"ai-api-tnhn/router/middleware"

	"github.com/gin-gonic/gin"
)

func (h HandlerFuncs) RainRoutes(api *gin.RouterGroup, mid middleware.Middleware, rainHandler *handler.RainHandler) {
	rain := api.Group("/water/rain")
	rain.Use(mid.MidBasicType())

	rain.GET("/:id/history", rainHandler.GetRainHistory)
	rain.GET("/:id/chart", rainHandler.GetRainChart)
	rain.GET("/by-date", rainHandler.GetRainDataByDate)
	rain.POST("/worker/session", rainHandler.UpdateWorkerSession)
}
