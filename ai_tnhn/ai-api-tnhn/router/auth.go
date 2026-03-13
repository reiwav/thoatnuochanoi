package router

import (
	"ai-api-tnhn/router/middleware"

	"github.com/gin-gonic/gin"
)

func (handlerFuncs HandlerFuncs) createAuthGroup(g *gin.RouterGroup,
	mid middleware.Middleware, groupName string) {
	authGroup := g.Group(groupName)
	authGroup.POST("/login", handlerFuncs.LoginHandler)
	authGroup.Use(mid.MidBasicType())
	authGroup.POST("/logout", handlerFuncs.LogoutHandler)
	authGroup.GET("/profile", handlerFuncs.GetProfileHandler)
	authGroup.PUT("/profile", handlerFuncs.UpdateProfileHandler)
	authGroup.PUT("/change-password", handlerFuncs.ChangePasswordHandler)
}
