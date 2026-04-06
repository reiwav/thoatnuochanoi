package router

import (
	"ai-api-tnhn/constant"
	"ai-api-tnhn/handler"
	"ai-api-tnhn/router/middleware"

	"github.com/gin-gonic/gin"
)

func (h *HandlerFuncs) RoleRoutes(r *gin.RouterGroup, mid middleware.Middleware, roleHandler *handler.RoleHandler) {
	roleGroup := r.Group("/roles")
	{
		// Anyone authenticated can list roles for assignment
		roleGroup.GET("", mid.MidBasicType(), roleHandler.List)
		roleGroup.POST("", mid.MidBasicType(constant.ROLE_SUPER_ADMIN), roleHandler.Create)
		roleGroup.PUT("/:id", mid.MidBasicType(constant.ROLE_SUPER_ADMIN), roleHandler.Update)
		roleGroup.DELETE("/:id", mid.MidBasicType(constant.ROLE_SUPER_ADMIN), roleHandler.Delete)
	}
}
