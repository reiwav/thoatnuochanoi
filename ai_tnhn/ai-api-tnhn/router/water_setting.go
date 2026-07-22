package router

import (
	"ai-api-tnhn/handler"
	"ai-api-tnhn/router/middleware"

	"github.com/gin-gonic/gin"
)

func (h HandlerFuncs) WaterThresholdSettingRoutes(apiAdmin *gin.RouterGroup, mid middleware.Middleware, handler *handler.WaterThresholdHandler) {
	group := apiAdmin.Group("/settings/water-thresholds")
	group.Use(mid.MidBasicType())
	{
		group.GET("/active", handler.GetActive)
		group.GET("", handler.List)
		group.POST("", handler.Create)
		group.PUT("/:id/activate", handler.Activate)
	}
}
