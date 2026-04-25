package middleware

import (
	"ai-api-tnhn/config"
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/permission"
	"ai-api-tnhn/utils/web"
	"fmt"
	"net/http"
	"runtime/debug"

	"github.com/gin-gonic/gin"
)

type Middleware interface {
	MidBasicType(role ...string) gin.HandlerFunc
	Authorize(permKey string) gin.HandlerFunc
	Recovery() gin.HandlerFunc
}

func NewMiddleware(conf config.Config,
	tokenRepo repository.Token,
	userRepo repository.User,
	roleRepo repository.Role,
	permService permission.Service,
	contextWith web.ContextWith,
	l logger.Logger,
) Middleware {
	return &mid{
		conf:        conf,
		ContextWith: contextWith,
		tokenRepo:   tokenRepo,
		userRepo:    userRepo,
		roleRepo:    roleRepo,
		permService: permService,
		l:           l,
	}
}

type mid struct {
	conf config.Config
	web.ContextWith
	web.JsonRender
	l           logger.Logger
	tokenRepo   repository.Token
	userRepo    repository.User
	roleRepo    repository.Role
	permService permission.Service
}

func (m mid) MidBasicType(roles ...string) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		var tokenID = m.GetToken(ctx.Request)
		var tok, err = m.tokenRepo.GetByID(ctx, tokenID)
		if err != nil || tok == nil {
			err = web.Unauthorized("access token not found")
			m.SendErrorForce(ctx, err, http.StatusUnauthorized)
			ctx.Abort()
			return
		}

		if len(roles) > 0 {
			if !contains(roles, tok.Role) && !tok.IsCompany {
				err = web.Unauthorized("access token not found " + tok.Role)
				m.SendErrorForce(ctx, err, http.StatusUnauthorized)
				ctx.Abort()
				return
			}
		}

		if tok.IsCompany {
			tok.OrgID = ""
		} else if tok.OrgID == "" {
			err = web.Unauthorized("org-id not found")
			m.SendErrorForce(ctx, err, http.StatusUnauthorized)
			ctx.Abort()
			return
		}
		m.ContextWithClient(ctx, &web.ClientCache{
			UserID:     tok.UserID,
			Token:      tokenID,
			OrgID:      tok.OrgID,
			Role:       tok.Role,
			Name:       tok.Name,
			IsEmployee: tok.IsEmployee,
			IsCompany:  tok.IsCompany,
		})
		m.SetUserID(ctx, tok.UserID)

		// Fetch full user profile and push to context
		user, err := m.userRepo.GetByID(ctx, tok.UserID)
		if err != nil {
			err = web.Unauthorized("user not found")
			m.SendErrorForce(ctx, err, http.StatusUnauthorized)
			ctx.Abort()
			return
		}
		// Populate transient role fields if needed
		if roleData, _ := m.roleRepo.GetByCode(ctx, user.Role); roleData != nil {
			user.IsEmployee = roleData.IsEmployee
			user.IsCompany = roleData.IsCompany
		}
		m.SetUser(ctx, user)

		ctx.Next()
	}
}

func (m mid) Authorize(permKey string) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		tokenID := m.GetToken(ctx.Request)
		tok, err := m.tokenRepo.GetByID(ctx, tokenID)
		if err != nil || tok == nil {
			m.SendErrorForce(ctx, web.Unauthorized("access token not found"), http.StatusUnauthorized)
			ctx.Abort()
			return
		}

		// Bypass check if Super Admin/Company leader
		if tok.IsCompany {
			ctx.Next()
			return
		}

		// Check permissions for normal roles
		perms, err := m.permService.GetPermissionsByRole(ctx, tok.Role)
		if err != nil {
			m.SendErrorForce(ctx, web.InternalServerError("failed to fetch permissions"), http.StatusInternalServerError)
			ctx.Abort()
			return
		}

		hasPerm := false
		for _, p := range perms {
			if p == permKey {
				hasPerm = true
				break
			}
		}

		if !hasPerm {
			m.SendErrorForce(ctx, web.Forbidden("bạn không có quyền thực hiện hành động này"), http.StatusForbidden)
			ctx.Abort()
			return
		}

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
