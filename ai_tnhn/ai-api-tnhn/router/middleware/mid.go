package middleware

import (
	"ai-api-tnhn/config"
	"ai-api-tnhn/constant"
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/utils/web"
	"fmt"
	"net/http"
	"runtime/debug"

	"github.com/gin-gonic/gin"
)

type Middleware interface {
	MidBasicType(role ...string) gin.HandlerFunc
	Recovery() gin.HandlerFunc
}

func NewMiddleware(conf config.Config,
	tokenRepo repository.Token,
	contextWith web.ContextWith,
	l logger.Logger,
) Middleware {
	return &mid{
		conf:        conf,
		ContextWith: contextWith,
		tokenRepo:   tokenRepo,
		l:           l,
	}
}

type mid struct {
	conf config.Config
	web.ContextWith
	web.JsonRender
	l         logger.Logger
	tokenRepo repository.Token
}

func (m mid) MidBasicType(roles ...string) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		fmt.Println("roles: ", roles)
		fmt.Println("ctx.Request: ", ctx.Request.URL.Path)
		var tokenID = m.GetToken(ctx.Request)
		var tok, err = m.tokenRepo.GetByID(ctx, tokenID)
		if err != nil || tok == nil {
			err = web.Unauthorized("access token not found")
			m.SendErrorForce(ctx, err, http.StatusUnauthorized)
			ctx.Abort()
			return
		}

		// Normalize typo from database
		if tok.Role == "supper_admib" || tok.Role == "super_admin " {
			tok.Role = constant.ROLE_SUPER_ADMIN
		}
		fmt.Println("tok.Role: ", tok.Role)
		fmt.Println("tokenID: ", tokenID)
		if len(roles) > 0 {
			if !contains(roles, tok.Role) {
				err = web.Unauthorized("access token not found " + tok.Role)
				m.SendErrorForce(ctx, err, http.StatusUnauthorized)
				ctx.Abort()
				return
			}
		}
		if tok.Role == constant.ROLE_SUPER_ADMIN {
			tok.OrgID = "all"
		} else if tok.OrgID == "" {
			err = web.Unauthorized("org-id not found")
			m.SendErrorForce(ctx, err, http.StatusUnauthorized)
			ctx.Abort()
			return
		}
		m.ContextWithClient(ctx, &web.ClientCache{
			UserID: tok.UserID,
			Token:  tokenID,
			OrgId:  tok.OrgID,
			Role:   tok.Role,
			Name:   tok.Name,
		})
		ctx.Next()
	}
}

func contains(slice []string, item string) bool {
	for _, a := range slice {
		if a == item {
			return true
		}
	}
	return false
}

func (m mid) Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				m.l.GetLogger().Error(err)

				if httpError, ok := err.(web.IHttpError); ok {
					m.SendErrorForce(c, err.(error), httpError.StatusCode())
				} else {
					fmt.Println(string(debug.Stack()))
					m.SendErrorForce(c, err.(error), http.StatusInternalServerError)
				}
				c.Abort()
				return
			}
		}()
		c.Next()
	}
}
