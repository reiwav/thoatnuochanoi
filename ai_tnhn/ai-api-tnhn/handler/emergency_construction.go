package handler

import (
	"ai-api-tnhn/handler/filters"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/emergency_construction"
	"ai-api-tnhn/utils/web"

	"github.com/gin-gonic/gin"
)

type EmergencyConstructionHandler struct {
	web.JsonRender
	web.ClientCache
	service emergency_construction.Service
}

func NewEmergencyConstructionHandler(service emergency_construction.Service) *EmergencyConstructionHandler {
	return &EmergencyConstructionHandler{
		service: service,
	}
}

func (h *EmergencyConstructionHandler) Create(c *gin.Context) {
	var item models.EmergencyConstruction
	if err := c.ShouldBindJSON(&item); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	userID := h.GetTokenFromContext(c).UserID
	err := h.service.Create(c.Request.Context(), &item, userID)
	web.AssertNil(err)
	h.SendData(c, item)
}

func (h *EmergencyConstructionHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var item models.EmergencyConstruction
	if err := c.ShouldBindJSON(&item); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	userID := h.GetTokenFromContext(c).UserID
	err := h.service.Update(c.Request.Context(), id, &item, userID)
	web.AssertNil(err)
	h.SendData(c, item)
}

func (h *EmergencyConstructionHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	err := h.service.Delete(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, nil)
}

func (h *EmergencyConstructionHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	item, err := h.service.GetByID(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, item)
}

func (h *EmergencyConstructionHandler) List(c *gin.Context) {
	req := filters.NewEmergencyConstructionListRequest()
	if err := c.ShouldBindQuery(req); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	items, total, err := h.service.List(c.Request.Context(), req)
	web.AssertNil(err)
	h.SendData(c, gin.H{
		"data":  items,
		"total": total,
	})
}

func (h *EmergencyConstructionHandler) ListHistory(c *gin.Context) {
	req := filters.NewEmergencyConstructionListRequest() // Use same for pagination
	if err := c.ShouldBindQuery(req); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	items, total, err := h.service.ListHistory(c.Request.Context(), req)
	web.AssertNil(err)
	h.SendData(c, gin.H{
		"data":  items,
		"total": total,
	})
}

func (h *EmergencyConstructionHandler) GetHistory(c *gin.Context) {
	id := c.Param("id")
	history, err := h.service.GetHistory(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, history)
}

func (h *EmergencyConstructionHandler) ReportSituation(c *gin.Context) {
	var item models.EmergencyConstructionSituation
	if err := c.ShouldBindJSON(&item); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	userID := h.GetTokenFromContext(c).UserID
	item.ReportedBy = userID

	err := h.service.ReportSituation(c.Request.Context(), &item)
	web.AssertNil(err)
	h.SendData(c, item)
}

func (h *EmergencyConstructionHandler) GetSituationHistory(c *gin.Context) {
	id := c.Param("id")
	history, err := h.service.GetSituationHistory(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, history)
}
