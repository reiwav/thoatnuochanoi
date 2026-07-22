package handler

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/setting"
	"ai-api-tnhn/utils/web"
	"strconv"

	"github.com/gin-gonic/gin"
)

type WaterThresholdHandler struct {
	web.JsonRender
	service     setting.WaterThresholdService
	contextWith web.ContextWith
}

func NewWaterThresholdHandler(service setting.WaterThresholdService, contextWith web.ContextWith) *WaterThresholdHandler {
	return &WaterThresholdHandler{
		service:     service,
		contextWith: contextWith,
	}
}

func (h *WaterThresholdHandler) GetActive(c *gin.Context) {
	yearStr := c.Query("year")
	year := 0
	if yearStr != "" {
		year, _ = strconv.Atoi(yearStr)
	}

	setting, err := h.service.GetActiveSetting(c.Request.Context(), year)
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, setting)
}

func (h *WaterThresholdHandler) List(c *gin.Context) {
	yearStr := c.Query("year")
	year := 0
	if yearStr != "" {
		year, _ = strconv.Atoi(yearStr)
	}
	status := c.Query("status")

	list, err := h.service.ListSettings(c.Request.Context(), year, status)
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, list)
}

func (h *WaterThresholdHandler) Create(c *gin.Context) {
	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
		h.SendError(c, web.Unauthorized("Vui lòng đăng nhập"))
		return
	}

	var req models.WaterThresholdSetting
	if err := c.ShouldBindJSON(&req); err != nil {
		h.SendError(c, web.BadRequest("Dữ liệu không hợp lệ: "+err.Error()))
		return
	}

	created, err := h.service.CreateSetting(c.Request.Context(), &req, user)
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, created)
}

func (h *WaterThresholdHandler) Activate(c *gin.Context) {
	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
		h.SendError(c, web.Unauthorized("Vui lòng đăng nhập"))
		return
	}

	id := c.Param("id")
	if id == "" {
		h.SendError(c, web.BadRequest("Thiếu ID cấu hình"))
		return
	}

	activated, err := h.service.ActivateSetting(c.Request.Context(), id, user)
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, activated)
}
