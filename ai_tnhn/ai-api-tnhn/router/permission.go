package router

import (
	"ai-api-tnhn/constant"
	"ai-api-tnhn/handler"
	"ai-api-tnhn/router/middleware"

	"github.com/gin-gonic/gin"
)

func (h *HandlerFuncs) PermissionRoutes(r *gin.RouterGroup, mid middleware.Middleware, permHandler *handler.PermissionHandler) {
	permGroup := r.Group("/permissions")
	{
		// Only super_admin can see and update the full matrix
		permGroup.GET("/matrix", mid.MidBasicType(constant.ROLE_SUPER_ADMIN), permHandler.GetMatrix)
		permGroup.POST("/matrix", mid.MidBasicType(constant.ROLE_SUPER_ADMIN), permHandler.UpdateMatrix)

		// Any authenticated user can get their own permissions
		permGroup.GET("/my", mid.MidBasicType(), permHandler.GetMyPermissions)
	}
}
