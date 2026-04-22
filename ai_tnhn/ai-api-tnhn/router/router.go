package router

import (
	"ai-api-tnhn/handler"
	"ai-api-tnhn/handler/google"
	"ai-api-tnhn/router/middleware"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"

	_ "ai-api-tnhn/docs"

	swaggerFiles "github.com/swaggo/files"
	gs "github.com/swaggo/gin-swagger"
)

// Create handlers
func (h *HandlerFuncs) Create(mid middleware.Middleware, orgHandler *handler.OrganizationHandler, empHandler *handler.EmployeeHandler, stationHandler *handler.StationHandler, inuHandler *handler.InundationHandler, waterHandler *handler.WaterHandler, googleHandler google.Handler, queryHandler *handler.QueryHandler, emConstructionHandler *handler.EmergencyConstructionHandler, weatherHandler *handler.WeatherHandler, contractCategoryHandler *handler.ContractCategoryHandler, contractHandler *handler.ContractHandler, pumpingHandler *handler.PumpingStationHandler, permHandler *handler.PermissionHandler, roleHandler *handler.RoleHandler, settingHandler *handler.SettingHandler) *gin.Engine {
	r := gin.Default()
	// Swagger
	r.GET("/swagger/*any", gs.WrapHandler(swaggerFiles.Handler))
	// ... (cors omitted for brevity in replace_file_content if I were using it, but I'll include enough context)
	r.Use(
		//h.GinLogger(),
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
	// Serve static web default frontend_dist
	r.Use(static.Serve("/", static.LocalFile("./frontend_dist", false)))

	r.Static("/public", "./public")

	// Add static route for local storage if configured
	// We'll get the path from main by passing it or just use a default if it's tricky here.
	// Actually, router.go doesn't have easy access to confg unless we pass it.
	// Looking at Create signature, it doesn't take confg.
	// But it uses ./public and ./frontend_dist.
	// I will add a generic /api/storage/file route.

	api := r.Group("/api")
	api.Static("/storage/file", "./uploads") // Defaulting to ./uploads, should match LocalStoragePath
	authGroup := api.Group("/auth")
	{
		authGroup.POST("/login", h.LoginHandler)
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
	h.StationRoutes(apiAdmin, mid, stationHandler, pumpingHandler)
	h.WaterRoutes(apiAdmin, mid, waterHandler)
	h.InundationRoutes(api, mid, inuHandler)
	h.GoogleRoutes(apiAdmin, mid, googleHandler)
	h.EmergencyConstructionRoutes(apiAdmin, mid, emConstructionHandler)
	h.WeatherRoutes(apiAdmin, mid, weatherHandler)
	h.ContractCategoryRoutes(apiAdmin, mid, contractCategoryHandler)
	h.ContractRoutes(apiAdmin, mid, contractHandler)
	h.PermissionRoutes(apiAdmin, mid, permHandler)
	h.RoleRoutes(apiAdmin, mid, roleHandler)
	h.SettingRoutes(apiAdmin, mid, settingHandler)
	apiAdmin.GET("/weather/rain/compare", mid.MidBasicType(), weatherHandler.GetComparisonReport)

	apiAdmin.POST("/database/query", mid.MidBasicType(), h.DatabaseQueryHandler)

	r.NoRoute(func(c *gin.Context) {
		// Nếu là request API thì trả về 404 JSON
		if strings.HasPrefix(c.Request.URL.Path, "/api") {
			c.JSON(404, gin.H{"message": "Not Found"})
			return
		}

		// Nếu path có phần mở rộng (ví dụ: .js, .css, .png) thì khả năng cao là file tĩnh bị thiếu
		// Trình duyệt nên nhận 404 thay vì nhận nội dung index.html để tránh lỗi MIME type
		path := c.Request.URL.Path
		if strings.Contains(filepath.Base(path), ".") {
			c.Status(404)
			return
		}

		// Ngược lại, phục vụ index.html cho SPA routing
		// Thêm header để tránh cache file index.html (giúp trình duyệt luôn cập nhật hash file mới khi build lại)
		c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
		c.File("./frontend_dist/index.html")
	})

	return r
}
