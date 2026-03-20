package router

import (
	"sensor-backend/handler"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func NewRouter(authH *handler.AuthHandler, sensorH *handler.SensorHandler, deviceH *handler.DeviceHandler) *gin.Engine {
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"POST", "GET", "OPTIONS", "PATCH", "PUT"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	r.POST("/api/auth/login", authH.Login)

	authorized := r.Group("/api")
	{
		data := authorized.Group("/data")
		{
			data.GET("/monitor", sensorH.GetMonitorData)
			data.GET("/history-trend", sensorH.GetHistoryTrend)
			data.GET("/alarms", sensorH.GetAlarms)
			data.GET("/outputs", sensorH.GetOutputs)
			data.PATCH("/outputs/:id", sensorH.ToggleOutput)
		}

		// Device Settings
		authorized.GET("/devices", deviceH.GetDevices)
		authorized.PATCH("/devices/:id/config", deviceH.UpdateDeviceConfig)
	}

	return r
}
