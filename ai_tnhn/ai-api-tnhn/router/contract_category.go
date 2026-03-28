package router

import (
	"ai-api-tnhn/constant"
	"ai-api-tnhn/handler"
	"ai-api-tnhn/router/middleware"

	"github.com/gin-gonic/gin"
)

func (h *HandlerFuncs) ContractCategoryRoutes(r *gin.RouterGroup, mid middleware.Middleware, handler *handler.ContractCategoryHandler) {
	group := r.Group("/contract-category")
	group.Use(mid.MidBasicType())
	{
		// Only Managers and Super Admins can manage categories
		group.GET("", handler.List)
		group.GET("/tree", handler.GetTree)
		group.GET("/:id", handler.GetByID)

		mgrGroup := group.Group("")
		mgrGroup.Use(mid.MidBasicType(constant.ROLE_SUPER_ADMIN, constant.ROLE_MANAGER))
		{
			mgrGroup.POST("", handler.Create)
			mgrGroup.PUT("/:id", handler.Update)
			mgrGroup.DELETE("/:id", handler.Delete)
		}
	}
}
