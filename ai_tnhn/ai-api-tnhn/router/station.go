package router

import (
	"ai-api-tnhn/handler"
	"ai-api-tnhn/router/middleware"

	"github.com/gin-gonic/gin"
)

func (h HandlerFuncs) StationRoutes(api *gin.RouterGroup, mid middleware.Middleware, stationHandler *handler.StationHandler, pumpingHandler *handler.PumpingStationHandler) {
	station := api.Group("/stations")
	station.Use(mid.MidBasicType())

	// Rain Stations
	rain := station.Group("/rain")
	{
		rain.GET("", stationHandler.ListRain)
		rain.GET("/:id", stationHandler.GetRainByID)
		rain.POST("", stationHandler.CreateRain)
		rain.PUT("/:id", stationHandler.UpdateRain)
		rain.DELETE("/:id", stationHandler.DeleteRain)
	}

	// Lake Stations
	lake := station.Group("/lake")
	{
		lake.GET("", stationHandler.ListLake)
		lake.GET("/:id", stationHandler.GetLakeByID)
		lake.POST("", stationHandler.CreateLake)
		lake.PUT("/:id", stationHandler.UpdateLake)
		lake.DELETE("/:id", stationHandler.DeleteLake)
	}

	// River Stations
	river := station.Group("/river")
	{
		river.GET("", stationHandler.ListRiver)
		river.GET("/:id", stationHandler.GetRiverByID)
		river.POST("", stationHandler.CreateRiver)
		river.PUT("/:id", stationHandler.UpdateRiver)
		river.DELETE("/:id", stationHandler.DeleteRiver)
	}

	// Pumping Stations
	pumping := station.Group("/pumping")
	{
		pumping.GET("", pumpingHandler.List)
		pumping.GET("/:id", pumpingHandler.Get)
		pumping.POST("", pumpingHandler.Create)
		pumping.PUT("/:id", pumpingHandler.Update)
		pumping.DELETE("/:id", pumpingHandler.Delete)
		pumping.POST("/report", pumpingHandler.CreateHistory)
		pumping.GET("/:id/history", pumpingHandler.ListHistory)
	}
}
