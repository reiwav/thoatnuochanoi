package router

import (
	"ai-api-tnhn/handler"
	"ai-api-tnhn/router/middleware"

	"github.com/gin-gonic/gin"
)

func (h HandlerFuncs) InundationRoutes(api *gin.RouterGroup, mid middleware.Middleware, inuHandler *handler.InundationHandler) {
	group := api.Group("/inundation")

	// SSE stream — outside auth middleware group (handles its own auth via token query param)
	group.GET("/stream", inuHandler.StreamSSE)

	group.Use(mid.MidBasicType()) // Require login
	{
		group.POST("/report", inuHandler.CreateReport)
		group.GET("/report/:id", inuHandler.GetReport)
		group.GET("/report/:id/updates", inuHandler.ListReportUpdates)
		group.PUT("/report/:id", inuHandler.UpdateReport)
		group.PUT("/report/:id/survey", inuHandler.UpdateSurvey)
		group.PUT("/report/:id/mech", inuHandler.UpdateMech)
		group.POST("/:id/update", inuHandler.AddUpdateSituation2)
		group.POST("/report/:id/review", inuHandler.ReviewReport)
		group.POST("/quick-finish", inuHandler.QuickFinish)
		group.POST("/update/:id/review", inuHandler.ReviewUpdate)
		group.PUT("/update/:id", inuHandler.UpdateSituationUpdateContent)
		group.GET("/reports", inuHandler.ListReports)
		group.GET("/points-status", inuHandler.GetPointsStatus)
		group.GET("/points-list", inuHandler.ListPointsByOrg)
		group.POST("/points", inuHandler.CreatePoint)
		group.PUT("/points/:id", inuHandler.UpdatePoint)
		group.DELETE("/points/:id", inuHandler.DeletePoint)
		group.GET("/yearly-history", inuHandler.GetYearlyHistory)
		group.GET("/yearly-history/export", inuHandler.ExportYearlyHistory)
	}
}
