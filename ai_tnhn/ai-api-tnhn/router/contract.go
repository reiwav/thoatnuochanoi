package router

import (
	"ai-api-tnhn/handler"
	"ai-api-tnhn/router/middleware"

	"github.com/gin-gonic/gin"
)

func (h *HandlerFuncs) ContractRoutes(r *gin.RouterGroup, mid middleware.Middleware, handler *handler.ContractHandler) {
	group := r.Group("/contracts")
	// Accessible by Super Admin and Manager
	group.Use(mid.MidBasicType())
	{
		group.GET("", handler.List)
		group.GET("/:id", handler.GetByID)
		group.POST("/prepare-folder", handler.PrepareFolder)
		group.POST("", handler.Create)
		group.PUT("/:id", handler.Update)
		group.DELETE("/:id", handler.Delete)
		group.POST("/:id/upload", handler.Upload)
		group.POST("/upload-to-folder", handler.UploadToFolder)
		group.DELETE("/delete-file", handler.DeleteFile)
	}
}
