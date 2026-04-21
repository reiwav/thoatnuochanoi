package handler

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/auth"
	"ai-api-tnhn/internal/service/contract_category"
	"ai-api-tnhn/utils/web"

	"github.com/gin-gonic/gin"
)

type ContractCategoryHandler struct {
	web.JsonRender
	service     contract_category.Service
	authService auth.Service
	contextWith web.ContextWith
}

func NewContractCategoryHandler(service contract_category.Service, authService auth.Service, contextWith web.ContextWith) *ContractCategoryHandler {
	return &ContractCategoryHandler{
		service:     service,
		authService: authService,
		contextWith: contextWith,
	}
}

// Create godoc
// @Summary Tạo mới một danh mục hợp đồng
// @Description Tạo mới một danh mục để tổ chức và quản lý các hợp đồng
// @Tags Danh mục hợp đồng
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param category body models.ContractCategory true "Dữ liệu danh mục"
// @Success 200 {object} web.Response{data=models.ContractCategory}
// @Failure 401 {object} web.ErrorResponse
// @Router /admin/contract-category [post]
func (h *ContractCategoryHandler) Create(c *gin.Context) {
	var category models.ContractCategory
	if err := c.ShouldBindJSON(&category); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	err := h.service.Create(c.Request.Context(), &category)
	web.AssertNil(err)
	h.SendData(c, category)
}

// Update godoc
// @Summary Cập nhật danh mục hợp đồng
// @Description Cập nhật thông tin chi tiết của một danh mục hợp đồng hiện có
// @Tags Danh mục hợp đồng
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID danh mục"
// @Param category body models.ContractCategory true "Dữ liệu danh mục cập nhật"
// @Success 200 {object} web.Response{data=models.ContractCategory}
// @Failure 401 {object} web.ErrorResponse
// @Router /admin/contract-category/{id} [put]
func (h *ContractCategoryHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var category models.ContractCategory
	if err := c.ShouldBindJSON(&category); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	err := h.service.Update(c.Request.Context(), id, &category)
	web.AssertNil(err)
	h.SendData(c, category)
}

// Delete godoc
// @Summary Xóa danh mục hợp đồng
// @Description Loại bỏ một danh mục hợp đồng ra khỏi hệ thống theo ID
// @Tags Danh mục hợp đồng
// @Security BearerAuth
// @Param id path string true "ID danh mục"
// @Success 200 {boolean} bool
// @Failure 401 {object} web.ErrorResponse
// @Router /admin/contract-category/{id} [delete]
func (h *ContractCategoryHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	err := h.service.Delete(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, nil)
}

// GetByID godoc
// @Summary Lấy thông tin danh mục theo ID
// @Description Truy xuất thông tin chi tiết của một danh mục hợp đồng cụ thể
// @Tags Danh mục hợp đồng
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID danh mục"
// @Success 200 {object} web.Response{data=models.ContractCategory}
// @Router /admin/contract-category/{id} [get]
func (h *ContractCategoryHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	category, err := h.service.GetByID(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, category)
}

// List godoc
// @Summary Danh sách danh mục hợp đồng
// @Description Truy xuất danh sách các danh mục hợp đồng có phân trang
// @Tags Danh mục hợp đồng
// @Produce json
// @Security BearerAuth
// @Param page query int false "Số trang"
// @Param size query int false "Số bản ghi mỗi trang"
// @Success 200 {object} web.Response{data=object{data=[]models.ContractCategory,total=int}}
// @Router /admin/contract-category [get]
func (h *ContractCategoryHandler) List(c *gin.Context) {
	f := filter.NewPaginationFilter()
	if err := c.ShouldBindQuery(f); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	categories, total, err := h.service.List(c.Request.Context(), f)
	web.AssertNil(err)
	h.SendData(c, gin.H{
		"data":  categories,
		"total": total,
	})
}

// GetTree godoc
// @Summary Lấy cấu trúc cây danh mục
// @Description Truy xuất toàn bộ danh mục dưới dạng cấu trúc cây phân cấp
// @Tags Danh mục hợp đồng
// @Produce json
// @Security BearerAuth
// @Success 200 {object} web.Response{data=[]object}
// @Router /admin/contract-category/tree [get]
func (h *ContractCategoryHandler) GetTree(c *gin.Context) {
	categories, err := h.service.GetTree(c.Request.Context())
	web.AssertNil(err)
	h.SendData(c, categories)
}
