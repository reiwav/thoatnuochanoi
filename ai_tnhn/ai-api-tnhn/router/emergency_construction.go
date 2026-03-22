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
		group.GET("/progress/:id", handler.GetProgressByID)
		group.POST("/progress", handler.ReportProgress)
		group.PUT("/progress/:id", handler.UpdateProgress)
		group.GET("/:id/progress", handler.GetProgressHistory)
		group.GET("/export", handler.ExportExcel)
	}
}
