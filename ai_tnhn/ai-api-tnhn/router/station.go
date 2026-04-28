package router

import (
	"ai-api-tnhn/handler"
	"ai-api-tnhn/router/middleware"

	"github.com/gin-gonic/gin"
)

func (h HandlerFuncs) StationRoutes(api *gin.RouterGroup, mid middleware.Middleware, stationHandler *handler.StationHandler, pumpingHandler *handler.PumpingStationHandler, wastewaterHandler *handler.WastewaterTreatmentHandler, sluiceHandler *handler.SluiceGateHandler) {
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

	// Wastewater Treatment Stations
	wastewater := station.Group("/wastewater")
	{
		wastewater.GET("", wastewaterHandler.List)
		wastewater.GET("/:id", wastewaterHandler.Get)
		wastewater.POST("", wastewaterHandler.Create)
		wastewater.PUT("/:id", wastewaterHandler.Update)
		wastewater.DELETE("/:id", wastewaterHandler.Delete)
		wastewater.POST("/:id/report", wastewaterHandler.SubmitReport)
		wastewater.GET("/:id/history", wastewaterHandler.ListHistory)
	}

	// Sluice Gate Stations
	sluice := station.Group("/sluice-gate")
	{
		sluice.GET("", sluiceHandler.List)
		sluice.GET("/:id", sluiceHandler.Get)
		sluice.POST("", sluiceHandler.Create)
		sluice.PUT("/:id", sluiceHandler.Update)
		sluice.DELETE("/:id", sluiceHandler.Delete)
		sluice.POST("/:id/report", sluiceHandler.Report)
		sluice.GET("/:id/history", sluiceHandler.ListHistory)
	}
}
