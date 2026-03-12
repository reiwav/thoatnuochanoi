package router

import (
	"ai-api-tnhn/handler"
	"ai-api-tnhn/router/middleware"

	"github.com/gin-gonic/gin"
)

func (h HandlerFuncs) EmergencyConstructionRoutes(rg *gin.RouterGroup, mid middleware.Middleware, handler *handler.EmergencyConstructionHandler) {
	group := rg.Group("/emergency-constructions")
	group.Use(mid.MidBasicType())
	{
		group.GET("", handler.List)
		group.GET("/history", handler.ListHistory)
		group.POST("", handler.Create)
		group.GET("/:id", handler.GetByID)
		group.PUT("/:id", handler.Update)
		group.DELETE("/:id", handler.Delete)
		group.GET("/:id/history", handler.GetHistory)
		group.POST("/situation", handler.ReportSituation)
		group.GET("/:id/situation", handler.GetSituationHistory)
	}
}
