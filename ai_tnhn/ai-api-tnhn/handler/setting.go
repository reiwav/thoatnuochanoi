package handler

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/setting"
	"ai-api-tnhn/internal/service/station/rain"
	"ai-api-tnhn/utils/web"

	"github.com/gin-gonic/gin"
)

type SettingHandler struct {
	web.JsonRender
	service     setting.Service
	worker      rain.Worker
	contextWith web.ContextWith
}

func NewSettingHandler(service setting.Service, worker rain.Worker, contextWith web.ContextWith) *SettingHandler {
	return &SettingHandler{
		service:     service,
		worker:      worker,
		contextWith: contextWith,
	}
}

func (h *SettingHandler) checkAdmin(c *gin.Context) (isAdmin bool, user *models.User) {
	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
		return false, nil
	}

	isAdmin = user.Role == "super_admin" || user.IsCompany
	return isAdmin, user
}

// GetFloodLevels godoc
// @Summary Lấy danh sách mức độ ngập lụt
// @Description Truy xuất danh sách các mức độ ngập lụt đã cấu hình
// @Tags Cấu hình
// @Produce json
// @Security BearerAuth
// @Success 200 {array} models.FloodLevel
// @Router /admin/settings/flood-levels [get]
func (h *SettingHandler) GetFloodLevels(c *gin.Context) {

	levels, err := h.service.GetFloodLevels(c.Request.Context())
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, levels)
}

// UpdateFloodLevels godoc
// @Summary Cập nhật danh sách mức độ ngập lụt
// @Description Cập nhật danh sách các mức độ ngập lụt đã cấu hình
// @Tags Cấu hình
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param levels body []models.FloodLevel true "Danh sách mức độ ngập"
// @Success 200 {boolean} bool
// @Router /admin/settings/flood-levels [put]
func (h *SettingHandler) UpdateFloodLevels(c *gin.Context) {
	isAdmin, user := h.checkAdmin(c)
	if !isAdmin {
		h.SendError(c, web.Unauthorized("Bạn không có quyền thực hiện"))
		return
	}

	var req []models.FloodLevel
	if err := c.ShouldBindJSON(&req); err != nil {
		h.SendError(c, web.BadRequest("Invalid request data: "+err.Error()))
		return
	}

	// Add user info to new levels
	for i := range req {
		if req[i].User == "" {
			req[i].User = user.Name
		}
	}

	err := h.service.UpdateFloodLevels(c.Request.Context(), req)
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, true)
}

// GetRainSetting godoc
// @Summary Lấy cấu hình worker mưa
// @Description Truy xuất cấu hình của RainWorker (sessionID, ...)
// @Tags Cấu hình
// @Produce json
// @Security BearerAuth
// @Success 200 {object} models.RainSetting
// @Router /admin/settings/rain [get]
func (h *SettingHandler) GetRainSetting(c *gin.Context) {
	setting, err := h.service.GetRainSetting(c.Request.Context())
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, setting)
}

// UpdateRainSetting godoc
// @Summary Cập nhật cấu hình worker mưa
// @Description Cập nhật cấu hình của RainWorker và áp dụng ngay lập tức
// @Tags Cấu hình
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param setting body models.RainSetting true "Cấu hình mưa"
// @Success 200 {boolean} bool
// @Router /admin/settings/rain [put]
func (h *SettingHandler) UpdateRainSetting(c *gin.Context) {
	isAdmin, _ := h.checkAdmin(c)
	if !isAdmin {
		h.SendError(c, web.Unauthorized("Bạn không có quyền thực hiện"))
		return
	}

	var req models.RainSetting
	if err := c.ShouldBindJSON(&req); err != nil {
		h.SendError(c, web.BadRequest("Invalid request data: "+err.Error()))
		return
	}

	err := h.service.UpdateRainSetting(c.Request.Context(), &req)
	if err != nil {
		h.SendError(c, err)
		return
	}

	// Apply changes to the running worker immediately
	if h.worker != nil {
		h.worker.SetSessionID(req.SessionID)
	}

	h.SendData(c, true)
}
