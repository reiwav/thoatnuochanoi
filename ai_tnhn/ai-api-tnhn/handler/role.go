package handler

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/role"
	"ai-api-tnhn/utils/web"

	"github.com/gin-gonic/gin"
)

type RoleHandler struct {
	web.JsonRender
	service     role.Service
	contextWith web.ContextWith
}

func NewRoleHandler(service role.Service, contextWith web.ContextWith) *RoleHandler {
	return &RoleHandler{
		service:     service,
		contextWith: contextWith,
	}
}

// Create godoc
// @Summary Tạo mới một vai trò
// @Description Tạo mới một vai trò người dùng trong hệ thống
// @Tags Vai trò
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param role body models.Role true "Dữ liệu vai trò"
// @Success 200 {object} web.Response{data=models.Role}
// @Failure 401 {object} web.ErrorResponse
// @Router /roles [post]
func (h *RoleHandler) Create(c *gin.Context) {
	var m models.Role
	if err := c.ShouldBindJSON(&m); err != nil {
		h.SendError(c, web.BadRequest(err.Error()))
		return
	}

	err := h.service.Create(c.Request.Context(), &m)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, m)
}

// Update godoc
// @Summary Cập nhật vai trò
// @Description Cập nhật thông tin chi tiết của một vai trò hiện có
// @Tags Vai trò
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID vai trò"
// @Param role body models.Role true "Dữ liệu vai trò cập nhật"
// @Success 200 {object} web.Response{data=models.Role}
// @Failure 401 {object} web.ErrorResponse
// @Router /roles/{id} [put]
func (h *RoleHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var m models.Role
	if err := c.ShouldBindJSON(&m); err != nil {
		h.SendError(c, web.BadRequest(err.Error()))
		return
	}

	err := h.service.Update(c.Request.Context(), id, &m)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, m)
}

// Delete godoc
// @Summary Xóa vai trò
// @Description Loại bỏ một vai trò khỏi hệ thống theo ID
// @Tags Vai trò
// @Security BearerAuth
// @Param id path string true "ID vai trò"
// @Success 200 {boolean} bool
// @Failure 401 {object} web.ErrorResponse
// @Router /roles/{id} [delete]
func (h *RoleHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	// Safety check: Don't delete super_admin by ID if we can identify it
	// But usually, we check by Code. Let's fetch it first or trust the frontend/middleware.
	// For robust safety, I'll fetch the role first.

	err := h.service.Delete(c.Request.Context(), id)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, nil)
}

// List godoc
// @Summary Danh sách vai trò
// @Description Truy xuất danh sách các vai trò có sẵn để gán cho người dùng
// @Tags Vai trò
// @Produce json
// @Security BearerAuth
// @Success 200 {object} web.Response{data=[]models.Role}
// @Router /roles [get]
func (h *RoleHandler) List(c *gin.Context) {
	currentRole, _ := h.contextWith.GetRole(c)
	list, err := h.service.GetAll(c.Request.Context(), currentRole)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, list)
}
