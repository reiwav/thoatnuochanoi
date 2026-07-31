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
		group.PUT("/point/:point_id/enterprise", inuHandler.ReportEnterprise)
		group.POST("/point/:point_id/update", inuHandler.ReportEnterpriseSituation)
		group.PUT("/point/:point_id/survey", inuHandler.ReportSurvey)
		group.PUT("/point/:point_id/mech", inuHandler.ReportMech)
		group.PUT("/point/:point_id/ktcl", inuHandler.ReportKTCL)
		group.PUT("/point/:point_id/correct", inuHandler.CorrectEnterpriseReport)
		group.PUT("/point/:point_id/correct-update", inuHandler.CorrectEnterpriseSituation)

		group.GET("/report/:id", inuHandler.GetReport)
		group.GET("/report/:id/updates", inuHandler.ListReportUpdates)
		group.POST("/report/:id/review", inuHandler.ReviewReport)
		group.POST("/quick-finish", inuHandler.QuickFinish)
		group.POST("/update/:id/review", inuHandler.ReviewUpdate)
		group.GET("/reports", inuHandler.ListReports)
		group.GET("/history", inuHandler.GetPointHistory)
		group.GET("/report-history", inuHandler.GetReportHistory)
		group.GET("/points-status", inuHandler.GetPointsStatus)
		group.GET("/points-list", inuHandler.ListPointsByOrg)
		group.POST("/points", inuHandler.CreatePoint)
		group.PUT("/points/:id", inuHandler.UpdatePoint)
		group.DELETE("/points/:id", inuHandler.DeletePoint)
		group.GET("/yearly-history", inuHandler.GetYearlyHistory)
		group.GET("/yearly-history/export", inuHandler.ExportYearlyHistory)
		group.GET("/by-date", inuHandler.GetHistoryByDateRange)
	}
}
