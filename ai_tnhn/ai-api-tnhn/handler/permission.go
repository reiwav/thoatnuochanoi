package handler

import (
	"ai-api-tnhn/internal/service/permission"
	"ai-api-tnhn/utils/web"

	"github.com/gin-gonic/gin"
)

type PermissionHandler struct {
	*web.JsonRender
	contextWith web.ContextWith
	permService permission.Service
}

func NewPermissionHandler(permService permission.Service, contextWith web.ContextWith) *PermissionHandler {
	return &PermissionHandler{
		permService: permService,
		contextWith:  contextWith,
	}
}

func (h *PermissionHandler) GetMatrix(c *gin.Context) {
	roles, perms, err := h.permService.GetMatrix(c.Request.Context())
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, gin.H{
		"roles":       roles,
		"permissions": perms,
	})
}

func (h *PermissionHandler) UpdateMatrix(c *gin.Context) {
	var req struct {
		Role        string   `json:"role"`
		Permissions []string `json:"permissions"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		h.SendError(c, web.BadRequest("Invalid request"))
		return
	}
	err := h.permService.UpdateMatrix(c.Request.Context(), req.Role, req.Permissions)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}

func (h *PermissionHandler) GetMyPermissions(c *gin.Context) {
	client := h.contextWith.GetTokenFromContext(c)
	if client == nil {
		h.SendError(c, web.Unauthorized("no client found"))
		return
	}
	perms, err := h.permService.GetPermissionsByRole(c.Request.Context(), client.Role)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, perms)
}
