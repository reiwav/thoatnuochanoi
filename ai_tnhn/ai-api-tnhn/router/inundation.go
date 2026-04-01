package router

import (
	"ai-api-tnhn/handler"
	"ai-api-tnhn/router/middleware"

	"github.com/gin-gonic/gin"
)

func (h HandlerFuncs) InundationRoutes(api *gin.RouterGroup, mid middleware.Middleware, inuHandler *handler.InundationHandler) {
	group := api.Group("/inundation")
	group.Use(mid.MidBasicType()) // Require login
	{
		group.POST("/report", inuHandler.CreateReport)
		group.GET("/report/:id", inuHandler.GetReport)
		group.POST("/:id/update", inuHandler.AddUpdateSituation)
		group.POST("/update/:id/review", inuHandler.ReviewUpdate)
		group.PUT("/update/:id", inuHandler.UpdateSituationUpdateContent)
		group.GET("/reports", inuHandler.ListReports)
		group.GET("/points-status", inuHandler.GetPointsStatus)
		group.POST("/points", inuHandler.CreatePoint)
		group.PUT("/points/:id", inuHandler.UpdatePoint)
		group.DELETE("/points/:id", inuHandler.DeletePoint)
	}
}
