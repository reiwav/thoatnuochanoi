package router

import (
	"sensor-backend/handler"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func NewRouter(authH *handler.AuthHandler, sensorH *handler.SensorHandler, deviceH *handler.DeviceHandler, aiH *handler.AIHandler) *gin.Engine {
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

		// AI Chat
		authorized.POST("/ai/chat", aiH.Chat)
	}

	// Serve Frontend Static Files
	r.Static("/assets", "./frontend/assets")
	r.StaticFile("/vite.svg", "./frontend/vite.svg")
	r.StaticFile("/favicon.ico", "./frontend/favicon.ico")

	// SPA Routing: Serve index.html for any other non-API routes
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		if strings.HasPrefix(path, "/api") {
			c.JSON(404, gin.H{"status": "error", "message": "API endpoint not found"})
			return
		}

		// Check if the requested file exists in the frontend folder
		// (Optional, if r.Static and r.StaticFile didn't catch it)
		c.File("./frontend/index.html")
	})

	return r
}
