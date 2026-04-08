package handler

import (
	"ai-api-tnhn/config"
	"ai-api-tnhn/internal/service/auth"
	"ai-api-tnhn/internal/service/token"
	"ai-api-tnhn/utils/web"
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

type AuthHandler struct {
	*web.JsonRender
	contextWith  web.ContextWith
	authService  auth.Service
	tokenService token.Service
	oauthConfig  oauth2.Config
	frontendURL  string
}

func NewAuthHandler(
	authService auth.Service,
	tokenService token.Service,
	contextWith web.ContextWith,
	oauthConf config.OAuthConfig,
) AuthHandler {
	return AuthHandler{
		authService:  authService,
		tokenService: tokenService,
		contextWith:  contextWith,
		oauthConfig: oauth2.Config{
			ClientID:     oauthConf.ClientID,
			ClientSecret: oauthConf.ClientSecret,
			RedirectURL:  oauthConf.CallbackURL,
			Scopes: []string{
				"https://www.googleapis.com/auth/userinfo.email",
				"https://www.googleapis.com/auth/userinfo.profile",
			},
			Endpoint: google.Endpoint,
		},
		frontendURL: oauthConf.FrontendURL,
	}
}

// 📌 1️⃣ Gửi yêu cầu nhập giấy
func (h *AuthHandler) LoginHandler(c *gin.Context) {
	var req auth.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.SendError(c, web.BadRequest("Invalid request: "+err.Error()))
		return
	}

	res, err := h.authService.Login(c.Request.Context(), req)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, res)
}

func (h *AuthHandler) LogoutHandler(c *gin.Context) {
	token := h.contextWith.GetToken(c.Request)
	err := h.authService.Logout(c.Request.Context(), token)
	web.AssertNil(err)
	h.SendData(c, nil)
}

func (h *AuthHandler) GetProfileHandler(c *gin.Context) {
	token := h.contextWith.GetToken(c.Request)
	fmt.Println("token: ", token)
	res, err := h.authService.GetProfile(c.Request.Context(), token)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, res)
}

func (h *AuthHandler) UpdateProfileHandler(c *gin.Context) {
	var req auth.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.SendError(c, web.BadRequest("Invalid request: "+err.Error()))
		return
	}

	token := h.contextWith.GetToken(c.Request)
	err := h.authService.UpdateProfile(c.Request.Context(), token, req)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}

func (h *AuthHandler) ChangePasswordHandler(c *gin.Context) {
	var req auth.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.SendError(c, web.BadRequest("Invalid request: "+err.Error()))
		return
	}

	token := h.contextWith.GetToken(c.Request)
	err := h.authService.ChangePassword(c.Request.Context(), token, req)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}

func (h *AuthHandler) GoogleLoginHandler(c *gin.Context) {
	url := h.oauthConfig.AuthCodeURL("state-token")
	c.Redirect(http.StatusTemporaryRedirect, url)
}

func (h *AuthHandler) GoogleCallbackHandler(c *gin.Context) {
	code := c.Query("code")
	token, err := h.oauthConfig.Exchange(context.Background(), code)
	if err != nil {
		h.SendError(c, web.BadRequest("Failed to exchange token: "+err.Error()))
		return
	}

	client := h.oauthConfig.Client(context.Background(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		h.SendError(c, web.BadRequest("Failed to get user info: "+err.Error()))
		return
	}
	defer resp.Body.Close()

	var userInfo struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		h.SendError(c, web.BadRequest("Failed to decode user info: "+err.Error()))
		return
	}

	res, err := h.authService.OAuthLogin(c.Request.Context(), userInfo.Email)
	if err != nil {
		h.SendError(c, err)
		return
	}

	// 4. Normalize role (consistent with Login logic)
	role := res.Role
	if role == "supper_admin" || role == "supper_admib" || role == "super_admin " {
		role = "super_admin"
	}
	if role == "giam_doc_xi_nghiep" {
		role = "giam_doc_xn"
	}

	// 5. Redirect to frontend with token, role, and name
	redirectURL := fmt.Sprintf("%s/?token=%s&role=%s&is_employee=%v&name=%s",
		h.frontendURL,
		res.ID,
		role,
		res.IsEmployee,
		res.Name,
	)
	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
}
