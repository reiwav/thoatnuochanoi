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

func (h *EmployeeHandler) Create(c *gin.Context) {
	var req models.User
	if err := c.ShouldBindJSON(&req); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	// OrgID should be set from token/context if not provided?
	// Or we assume Admin user passes OrgID or we force it from Admin's OrgID.
	// Usually admin manages their own org.
	orgID, err := h.contextWith.GetOrgId(c)
	if err == nil && orgID != "" && orgID != "all" {
		req.OrgID = orgID
	}
	// If OrgID is still empty (e.g. Super Admin didn't provide one in JSON),
	// service checks it. Super Admin might provide OrgID in JSON.

	res, err := h.service.Create(c.Request.Context(), &req)
	web.AssertNil(err)
	h.SendData(c, res)
}

func (h *EmployeeHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req models.User
	if err := c.ShouldBindJSON(&req); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	// Similar logic for OrgID if needed, but existing user has OrgID.
	// Service handles retrieval.

	err := h.service.Update(c.Request.Context(), id, &req)
	web.AssertNil(err)
	h.SendData(c, true)
}

func (h *EmployeeHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	err := h.service.Delete(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, true)
}

func (h *EmployeeHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	res, err := h.service.GetByID(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, res)
}

func (h *EmployeeHandler) List(c *gin.Context) {
	req := filters.NewEmployeeListRequest()
	if err := c.ShouldBindQuery(req); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	// Force OrgID from context for security (unless Super Admin with 'all')
	// Super Admin logic (Role check) should be here or middleware.
	// Assuming MidBasicType middleware already sets OrgID in context.
	orgID, err := h.contextWith.GetOrgId(c)
	if err == nil {
		if orgID != "all" {
			req.OrgID = orgID // Override request OrgID with context OrgID
		} else {
			// If context is "all" (Super Admin), trust request OrgID or fetch all.
			// Req.OrgID already bound.
		}
	}

	res, total, err := h.service.List(c.Request.Context(), req)
	web.AssertNil(err)
	h.SendData(c, gin.H{
		"data":  res,
		"total": total,
	})
}
