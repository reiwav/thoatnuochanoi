package router

import (
	"ai-api-tnhn/handler"
	"ai-api-tnhn/router/middleware"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
)

// Create handlers
func (h HandlerFuncs) Create(mid middleware.Middleware, orgHandler *handler.OrganizationHandler, empHandler *handler.EmployeeHandler, stationHandler *handler.StationHandler, inuHandler *handler.InundationHandler, waterHandler *handler.WaterHandler, googleHandler *handler.GoogleHandler, queryHandler *handler.QueryHandler, emConstructionHandler *handler.EmergencyConstructionHandler, weatherHandler *handler.WeatherHandler) *gin.Engine {
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
	r.Use(func(c *gin.Context) {
		// Nếu request không phải API và không tìm thấy file vật lý
		if !strings.HasPrefix(c.Request.URL.Path, "/api") {
			path := filepath.Join("./frontend_dist", c.Request.URL.Path)
			_, err := os.Stat(path)
			if os.IsNotExist(err) {
				c.File("./frontend_dist/index.html")
				c.Abort()
				return
			}
		}
		c.Next()
	})
	// Serve static web default frontend_dist
	r.Use(static.Serve("/", static.LocalFile("./frontend_dist", false)))

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
	h.WeatherRoutes(apiAdmin, mid, weatherHandler)

	apiAdmin.POST("/database/query", mid.MidBasicType(), h.DatabaseQueryHandler)

	r.NoRoute(func(c *gin.Context) {
		c.File("./frontend_dist/index.html")
	})

	return r
}
