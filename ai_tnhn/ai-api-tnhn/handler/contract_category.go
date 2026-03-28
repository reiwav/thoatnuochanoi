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

func (h *ContractCategoryHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	err := h.service.Delete(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, nil)
}

func (h *ContractCategoryHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	category, err := h.service.GetByID(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, category)
}

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

func (h *ContractCategoryHandler) GetTree(c *gin.Context) {
	categories, err := h.service.GetTree(c.Request.Context())
	web.AssertNil(err)
	h.SendData(c, categories)
}
