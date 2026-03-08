package router

import (
	"ai-api-tnhn/handler"
	"ai-api-tnhn/router/middleware"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// Create handlers
func (h HandlerFuncs) Create(mid middleware.Middleware, orgHandler *handler.OrganizationHandler, empHandler *handler.EmployeeHandler, stationHandler *handler.StationHandler, inuHandler *handler.InundationHandler, waterHandler *handler.WaterHandler, googleHandler *handler.GoogleHandler, queryHandler *handler.QueryHandler, emConstructionHandler *handler.EmergencyConstructionHandler) *gin.Engine {
	r := gin.Default()
	// ... (cors omitted for brevity in replace_file_content if I were using it, but I'll include enough context)
	r.Use(
		h.GinLogger(),
		h.GinRecovery(),
		cors.New(cors.Config{
			AllowOrigins:     []string{"*"},
			AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
			AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
			ExposeHeaders:    []string{"Content-Length"},
			AllowCredentials: true,
			MaxAge:           12 * time.Hour,
		}),
	)
	r.SetTrustedProxies(nil)
	r.Static("/public", "./public")
	api := r.Group("/api")
	authGroup := api.Group("/auth")
	{
		authGroup.POST("/login", h.LoginHandler)
		authGroup.POST("/employee-login", h.EmployeeLoginHandler)
		authGroup.GET("/google/login", h.GoogleLoginHandler)
		authGroup.GET("/google/callback", h.GoogleCallbackHandler)

		authGroup.Use(mid.MidBasicType())
		authGroup.POST("/logout", h.LogoutHandler)
		authGroup.GET("/profile", h.GetProfileHandler)
		authGroup.PUT("/profile", h.UpdateProfileHandler)
		authGroup.PUT("/change-password", h.ChangePasswordHandler)
	}

	apiAdmin := api.Group("/admin")

	h.OrganizationRoutes(apiAdmin, mid, orgHandler)
	h.EmployeeRoutes(apiAdmin, mid, empHandler)
	h.StationRoutes(apiAdmin, mid, stationHandler)
	h.WaterRoutes(apiAdmin, mid, waterHandler)
	h.InundationRoutes(api, mid, inuHandler)
	h.GoogleRoutes(apiAdmin, mid, googleHandler)
	h.EmergencyConstructionRoutes(apiAdmin, mid, emConstructionHandler)

	apiAdmin.POST("/database/query", mid.MidBasicType(), h.DatabaseQueryHandler)

	return r
}
