package router

import (
	"ai-api-tnhn/handler/public"
	"ai-api-tnhn/router/middleware"
	"github.com/gin-gonic/gin"
)

// PublicRoutes configures the endpoints for third-party public API
func (h *HandlerFuncs) PublicRoutes(r *gin.RouterGroup, mid middleware.Middleware, handler *public.Handler) {
	v1 := r.Group("/v1")
	
	// Apply security middlewares: RSA check and Rate Limiting
	v1.Use(mid.RSAPublicAuthMiddleware(), mid.RateLimitMiddleware())

	// Endpoints
	v1.GET("/stations", handler.GetMasterStations)
	
	water := v1.Group("/water")
	{
		water.GET("/lake/:id", handler.GetLakeData)
		water.GET("/river/:id", handler.GetRiverData)
	}
	
	v1.GET("/rain/:id", handler.GetRainData)
	v1.GET("/inundation/:id", handler.GetInundationData)
	v1.GET("/sluice-gate/:id", handler.GetSluiceGateData)
	v1.GET("/wastewater/:id", handler.GetWastewaterData)
}
