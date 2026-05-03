package router

import (
	"ai-api-tnhn/handler"
	"ai-api-tnhn/router/middleware"

	"github.com/gin-gonic/gin"
)

func (h HandlerFuncs) SettingRoutes(apiAdmin *gin.RouterGroup, mid middleware.Middleware, settingHandler *handler.SettingHandler) {
	group := apiAdmin.Group("/settings")
	group.Use(mid.MidBasicType()) // Require login
	{
		group.GET("/flood-levels", settingHandler.GetFloodLevels)
		group.PUT("/flood-levels", settingHandler.UpdateFloodLevels)
		group.GET("/rain", settingHandler.GetRainSetting)
		group.PUT("/rain", settingHandler.UpdateRainSetting)
	}
}
