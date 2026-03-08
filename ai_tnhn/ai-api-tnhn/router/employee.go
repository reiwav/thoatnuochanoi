package router

import (
	"ai-api-tnhn/constant"
	"ai-api-tnhn/handler"
	"ai-api-tnhn/router/middleware"

	"github.com/gin-gonic/gin"
)

func (h *HandlerFuncs) EmployeeRoutes(g *gin.RouterGroup, mid middleware.Middleware, empHandler *handler.EmployeeHandler) {
	// Employees management - only accessible by Admin/SuperAdmin
	// Assuming MidBasicType checks for valid token.
	// Role check can be here or in handler.
	// We allow SUPER_ADMIN and ADMIN_ORG (if exists) to manage employees.
	grp := g.Group("/employees", mid.MidBasicType(constant.ROLE_SUPER_ADMIN, constant.ROLE_ADMIN_ORG))
	{
		grp.POST("", empHandler.Create)
		grp.PUT("/:id", empHandler.Update)
		grp.DELETE("/:id", empHandler.Delete)
		grp.GET("/:id", empHandler.GetByID)
		grp.GET("", empHandler.List)
	}
}
