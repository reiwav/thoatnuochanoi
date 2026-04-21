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
		contextWith: contextWith,
	}
}

// GetMatrix godoc
// @Summary Lấy ma trận quyền hạn
// @Description Truy xuất danh sách vai trò và quyền hạn tương ứng để quản trị
// @Tags Quyền hạn
// @Produce json
// @Security BearerAuth
// @Success 200 {object} web.Response{data=object{roles=[]models.Role,permissions=[]models.Permission}}
// @Failure 401 {object} web.ErrorResponse
// @Router /admin/permissions/matrix [get]
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

// UpdateMatrix godoc
// @Summary Cập nhật ma trận quyền hạn
// @Description Cập nhật các quyền hạn được gán cho một vai trò cụ thể
// @Tags Quyền hạn
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body object{role=string,permissions=[]string} true "Dữ liệu vai trò và danh sách mã quyền hạn"
// @Success 200 {boolean} bool
// @Failure 401 {object} web.ErrorResponse
// @Router /admin/permissions/matrix [post]
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

// GetMyPermissions godoc
// @Summary Lấy quyền hạn của tôi
// @Description Truy xuất danh sách quyền được gán cho vai trò của người dùng hiện tại
// @Tags Quyền hạn
// @Produce json
// @Security BearerAuth
// @Success 200 {object} web.Response{data=[]string}
// @Failure 401 {object} web.ErrorResponse
// @Router /admin/permissions/my [get]
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
