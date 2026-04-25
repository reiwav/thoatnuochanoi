package handler

import (
	"ai-api-tnhn/handler/filters"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/organization"
	"ai-api-tnhn/utils/web"

	"github.com/gin-gonic/gin"
)

type OrganizationHandler struct {
	web.JsonRender
	service     organization.Service
	roleRepo    repository.Role
	contextWith web.ContextWith
}

func NewOrganizationHandler(service organization.Service, roleRepo repository.Role, contextWith web.ContextWith) *OrganizationHandler {
	return &OrganizationHandler{
		service:     service,
		roleRepo:    roleRepo,
		contextWith: contextWith,
	}
}

// CheckSuperAdmin - Helper to check role
func (h *OrganizationHandler) CheckSuperAdmin(c *gin.Context) bool {
	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
		return false
	}
	return user.Role == "super_admin"
}

// Create godoc
// @Summary Tạo mới một đơn vị/xí nghiệp
// @Description Tạo mới một đơn vị trong hệ thống (Chủ yếu dành cho Super Admin)
// @Tags Đơn vị
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param organization body models.Organization true "Dữ liệu đơn vị"
// @Success 200 {object} web.Response{data=models.Organization}
// @Failure 401 {object} web.ErrorResponse
// @Router /admin/organizations [post]
func (h *OrganizationHandler) Create(c *gin.Context) {
	// TODO: Add Super Admin Authorize Check here when Middleware supports it or fetch User.
	// For now, structure the handler.

	var org models.Organization
	if err := c.ShouldBindJSON(&org); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	err := h.service.Create(c.Request.Context(), &org)
	web.AssertNil(err)
	h.SendData(c, org)
}

// Update godoc
// @Summary Cập nhật thông tin đơn vị
// @Description Cập nhật thông tin chi tiết của một đơn vị hiện có
// @Tags Đơn vị
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID của đơn vị"
// @Param organization body models.Organization true "Dữ liệu đơn vị cập nhật"
// @Success 200 {object} web.Response{data=models.Organization}
// @Failure 401 {object} web.ErrorResponse
// @Router /admin/organizations/{id} [put]
func (h *OrganizationHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var org models.Organization
	if err := c.ShouldBindJSON(&org); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	err := h.service.Update(c.Request.Context(), id, &org)
	web.AssertNil(err)
	h.SendData(c, org)
}

// Delete godoc
// @Summary Xóa đơn vị
// @Description Loại bỏ một đơn vị khỏi hệ thống theo ID
// @Tags Đơn vị
// @Security BearerAuth
// @Param id path string true "ID của đơn vị"
// @Success 200 {boolean} bool
// @Failure 401 {object} web.ErrorResponse
// @Router /admin/organizations/{id} [delete]
func (h *OrganizationHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	err := h.service.Delete(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, nil)
}

// GetByID godoc
// @Summary Lấy thông tin đơn vị theo ID
// @Description Truy xuất thông tin chi tiết của một đơn vị cụ thể
// @Tags Đơn vị
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID của đơn vị"
// @Success 200 {object} web.Response{data=models.Organization}
// @Failure 404 {object} web.ErrorResponse
// @Router /admin/organizations/{id} [get]
func (h *OrganizationHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	org, err := h.service.GetByID(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, org)
}

// List godoc
// @Summary Danh sách đơn vị
// @Description Truy xuất danh sách các đơn vị với tùy chọn lọc
// @Tags Đơn vị
// @Produce json
// @Security BearerAuth
// @Param id query string false "Lọc theo ID"
// @Param name query string false "Lọc theo Tên"
// @Param page query int false "Số trang"
// @Param size query int false "Số bản ghi mỗi trang"
// @Success 200 {object} web.Response{data=object{data=[]models.Organization,total=int}}
// @Router /admin/organizations [get]
func (h *OrganizationHandler) List(c *gin.Context) {
	req := filters.NewOrganizationListRequest()
	if err := c.ShouldBindQuery(req); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	user, err := h.contextWith.GetUser(c)
	if err == nil && user != nil {
		if !user.IsCompany {
			req.ID = user.OrgID
		}
	}

	orgs, total, err := h.service.List(c.Request.Context(), req)
	web.AssertNil(err)
	h.SendData(c, gin.H{
		"data":  orgs,
		"total": total,
	})
}

// GetSelectionList godoc
// @Summary Lấy danh sách đơn vị để lựa chọn
// @Description Truy xuất danh sách đơn vị phục vụ hiển thị trong các ô chọn (dropdown)
// @Tags Đơn vị
// @Produce json
// @Security BearerAuth
// @Success 200 {object} web.Response{data=object{primary=[]models.Organization,shared=[]models.Organization}}
// @Router /admin/organizations/selection [get]
func (h *OrganizationHandler) GetSelectionList(c *gin.Context) {
	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
		h.SendError(c, web.Unauthorized("Vui lòng đăng nhập lại"))
		return
	}
	primaryOrgs, sharedOrgs, err := h.service.GetPrimaryAndShared(c.Request.Context(), user.ID)
	web.AssertNil(err)

	h.SendData(c, gin.H{
		"primary": primaryOrgs,
		"shared":  sharedOrgs,
	})
}
