package router

import (
	"ai-api-tnhn/constant"
	"ai-api-tnhn/handler"
	"ai-api-tnhn/router/middleware"

	"github.com/gin-gonic/gin"
)

func (h *HandlerFuncs) OrganizationRoutes(g *gin.RouterGroup, mid middleware.Middleware, orgHandler *handler.OrganizationHandler) {
	org := g.Group("/organizations", mid.MidBasicType(constant.ROLE_SUPER_ADMIN, constant.ROLE_ADMIN_ORG, constant.ROLE_EMPLOYEE)) // Apply Authentication Middleware
	{
		org.POST("", orgHandler.Create)
		org.PUT("/:id", orgHandler.Update)
		org.DELETE("/:id", orgHandler.Delete)
		org.GET("/:id", orgHandler.GetByID)
		org.GET("", orgHandler.List)
	}
}
