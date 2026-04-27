package handler

import (
	"ai-api-tnhn/handler/filters"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/employee"
	"ai-api-tnhn/utils/web"

	"github.com/gin-gonic/gin"
)

type EmployeeHandler struct {
	web.JsonRender
	service     employee.Service
	contextWith web.ContextWith
}

func NewEmployeeHandler(service employee.Service, contextWith web.ContextWith) *EmployeeHandler {
	return &EmployeeHandler{
		service:     service,
		contextWith: contextWith,
	}
}

// Create godoc
// @Summary Tạo mới một nhân viên
// @Description Tạo mới một người dùng/nhân viên hệ thống
// @Tags Nhân viên
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param employee body models.User true "Dữ liệu nhân viên"
// @Success 200 {object} web.Response{data=models.User}
// @Failure 401 {object} web.ErrorResponse
// @Router /admin/employees [post]
func (h *EmployeeHandler) Create(c *gin.Context) {
	var req models.User
	if err := c.ShouldBindJSON(&req); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	orgID, err := h.contextWith.GetOrgID(c)
	web.AssertNil(err)
	if orgID != "" {
		req.OrgID = orgID
	}

	currentRole, _ := h.contextWith.GetRole(c)
	res, err := h.service.Create(c.Request.Context(), &req, currentRole)
	web.AssertNil(err)
	h.SendData(c, res)
}

// Update godoc
// @Summary Cập nhật thông tin nhân viên
// @Description Cập nhật thông tin chi tiết của một người dùng/nhân viên hiện có
// @Tags Nhân viên
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID nhân viên"
// @Param employee body models.User true "Dữ liệu nhân viên cập nhật"
// @Success 200 {boolean} bool
// @Failure 401 {object} web.ErrorResponse
// @Router /admin/employees/{id} [put]
func (h *EmployeeHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req models.User
	if err := c.ShouldBindJSON(&req); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	// Similar logic for OrgID if needed, but existing user has OrgID.
	// Service handles retrieval.

	// Get current user's role from context
	currentRole, _ := h.contextWith.GetRole(c)
	err := h.service.Update(c.Request.Context(), id, &req, currentRole)
	web.AssertNil(err)
	h.SendData(c, true)
}

// Delete godoc
// @Summary Xóa nhân viên
// @Description Loại bỏ một người dùng/nhân viên theo ID
// @Tags Nhân viên
// @Security BearerAuth
// @Param id path string true "ID nhân viên"
// @Success 200 {boolean} bool
// @Failure 401 {object} web.ErrorResponse
// @Router /admin/employees/{id} [delete]
func (h *EmployeeHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	err := h.service.Delete(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, true)
}

// GetByID godoc
// @Summary Lấy thông tin nhân viên theo ID
// @Description Truy xuất thông tin chi tiết của một người dùng/nhân viên cụ thể
// @Tags Nhân viên
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID nhân viên"
// @Success 200 {object} web.Response{data=models.User}
// @Failure 404 {object} web.ErrorResponse
// @Router /admin/employees/{id} [get]
func (h *EmployeeHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	res, err := h.service.GetByID(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, res)
}

// List godoc
// @Summary Danh sách nhân viên
// @Description Truy xuất danh sách nhân viên với tính năng lọc
// @Tags Nhân viên
// @Produce json
// @Security BearerAuth
// @Param org_id query string false "Lọc theo ID đơn vị"
// @Param name query string false "Lọc theo tên"
// @Param page query int false "Số trang"
// @Param size query int false "Số bản ghi mỗi trang"
// @Success 200 {object} web.Response{data=object{data=[]models.User,total=int}}
// @Router /admin/employees [get]
func (h *EmployeeHandler) List(c *gin.Context) {
	req := filters.NewEmployeeListRequest()
	if err := c.ShouldBindQuery(req); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	orgID, err := h.contextWith.GetOrgID(c)
	web.AssertNil(err)
	if orgID != "" {
		req.OrgID = orgID
	}

	currentGroup, _ := h.contextWith.GetGroup(c)
	res, total, err := h.service.List(c.Request.Context(), req, currentGroup)
	web.AssertNil(err)
	h.SendData(c, gin.H{
		"data":  res,
		"total": total,
	})
}
