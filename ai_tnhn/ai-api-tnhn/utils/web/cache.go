package web

import (
	"net/http"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
)

type ContextWith interface {
	GetOrgID(ctx *gin.Context) (string, error)
	SetUserID(ctx *gin.Context, uID string)
	GetUserID(ctx *gin.Context) (string, error)
	GetQrcodeID(ctx *gin.Context) (string, error)
	GetRole(ctx *gin.Context) (string, error)
	SetQrcodeID(ctx *gin.Context, uID string)
	GetToken(r *http.Request) string
	GetTokenSocket(r http.Header, requets url.URL) string
	GetTokenPublic(r *http.Request) string
	GetDeviceID(ctx *gin.Context) (string, error)
	ContextWithClient(ctx *gin.Context, u *ClientCache)
	GetTokenFromContext(ctx *gin.Context) *ClientCache
	GetXQrCodeHeader(r *http.Request) (string, error)
}

func NewContextWith() ContextWith {
	return &ClientCache{}
}

type ClientCache struct {
	Token      string
	UserID     string
	Name       string
	OrgID      string
	DeviceID   string
	Role       string
	IsEmployee bool
	IsCompany  bool
}

const xCacheClient = "x-cache-client"
const xUserID = "x-user-id"
const xDeviceID = "x-device-id"
const xQrcodeID = "x-qrcode-id"

func (c *ClientCache) GetUserID(ctx *gin.Context) (string, error) {
	uID := ctx.GetString(xUserID)
	if uID == "" {
		cache := c.GetTokenFromContext(ctx)
		if cache != nil {
			uID = cache.UserID
		}
	}
	if uID == "" {
		return uID, BadRequest("user-id not found")
	}
	return uID, nil
}


func (c *ClientCache) GetOrgID(ctx *gin.Context) (string, error) {
	uID := c.GetTokenFromContext(ctx).OrgID
	if uID == "" {
		return uID, BadRequest("org-id not found")
	}
	return uID, nil
}

func (c *ClientCache) GetRole(ctx *gin.Context) (string, error) {
	role := c.GetTokenFromContext(ctx).Role
	if role == "" {
		return "", BadRequest("role not found")
	}
	return role, nil
}

func (c *ClientCache) GetDeviceID(ctx *gin.Context) (string, error) {
	uID := ctx.GetString(xDeviceID)
	if uID == "" {
		return uID, BadRequest("device-id not found")
	}
	return uID, nil
}

func (c *ClientCache) SetUserID(ctx *gin.Context, uID string) {
	ctx.Set(xUserID, uID)
}

func (c *ClientCache) SetQrcodeID(ctx *gin.Context, uID string) {
	ctx.Set(xQrcodeID, uID)
}

func (c *ClientCache) GetQrcodeID(ctx *gin.Context) (string, error) {
	uID := ctx.GetString(xQrcodeID)
	if uID == "" {
		return uID, BadRequest("qrcode-id not found")
	}
	return uID, nil
}

func (c *ClientCache) ContextWithClient(ctx *gin.Context, u *ClientCache) {
	ctx.Set(xCacheClient, u)
}

func (c *ClientCache) GetTokenFromContext(ctx *gin.Context) *ClientCache {
	if token, ok := ctx.Get(xCacheClient); ok {
		return token.(*ClientCache)
	} else {
		panic(BadRequest("Client Cache not found"))
	}

}

const bearerHeader = "Bearer "
const accessToken = "access_token"

func (c *ClientCache) GetToken(r *http.Request) string {
	var authHeader = r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, bearerHeader) {
		return strings.TrimPrefix(authHeader, bearerHeader)
	}
	return r.URL.Query().Get(accessToken)
}

func (c *ClientCache) GetXQrCodeHeader(r *http.Request) (string, error) {
	var xQrID = r.Header.Get(xQrcodeID)
	if xQrID == "" {
		return "", NotFound("qrcode not found")
	}
	return xQrID, nil
}

func (c *ClientCache) GetTokenSocket(r http.Header, requets url.URL) string {
	var authHeader = r.Get("Authorization")
	if strings.HasPrefix(authHeader, bearerHeader) {
		return strings.TrimPrefix(authHeader, bearerHeader)
	}
	return requets.Query().Get(accessToken)
}

func (c *ClientCache) GetTokenPublic(r *http.Request) string {
	var authHeader = r.Header.Get("public")
	if strings.HasPrefix(authHeader, bearerHeader) {
		return strings.TrimPrefix(authHeader, bearerHeader)
	}
	return ""
}
