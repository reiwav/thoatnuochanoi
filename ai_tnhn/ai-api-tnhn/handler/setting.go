package handler

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/setting"
	"ai-api-tnhn/internal/service/station/rain"
	"ai-api-tnhn/utils/web"
	"context"

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

// SyncRainStations godoc
// @Summary Đồng bộ dữ liệu các trạm mưa thủ công
// @Description Bắt đầu tiến trình đồng bộ dữ liệu lượng mưa từ Vrain và stream log kết quả
// @Tags Cấu hình
// @Produce text/event-stream
// @Security BearerAuth
// @Param access_token query string true "Access token"
// @Success 200 {string} string "SSE stream"
// @Router /admin/settings/rain/sync [get]
func (h *SettingHandler) SyncRainStations(c *gin.Context) {
	isAdmin, _ := h.checkAdmin(c)
	if !isAdmin {
		h.SendError(c, web.Unauthorized("Bạn không có quyền thực hiện"))
		return
	}

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")
	c.Writer.Flush()

	// Khởi tạo kênh nhận tiến trình
	progressChan := make(chan string, 100)
	ctx, cancel := context.WithCancel(c.Request.Context())
	defer cancel()

	// Chạy đồng bộ trong goroutine
	go func() {
		defer close(progressChan)
		h.worker.SyncWithProgress(ctx, progressChan)
	}()

	// Nhận log và stream về client
	for {
		select {
		case <-c.Request.Context().Done():
			return
		case msg, ok := <-progressChan:
			if !ok {
				return
			}
			c.SSEvent("message", msg)
			c.Writer.Flush()
		}
	}
}

// AutoGetRainSession godoc
// @Summary Tự động lấy Session ID từ Vrain
// @Description Tự động đăng nhập và lấy Session ID mới từ thoatnuochanoi.vn
// @Tags Cấu hình
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]string
// @Router /admin/settings/rain/auto-session [post]
func (h *SettingHandler) AutoGetRainSession(c *gin.Context) {
	isAdmin, _ := h.checkAdmin(c)
	if !isAdmin {
		h.SendError(c, web.Unauthorized("Bạn không có quyền thực hiện"))
		return
	}

	sessionID, err := h.worker.AutoLoginVrain(c.Request.Context())
	if err != nil {
		h.SendError(c, web.InternalServerError("Không thể lấy Session ID tự động: "+err.Error()))
		return
	}

	// Tự động lưu cấu hình vào database
	err = h.service.UpdateRainSetting(c.Request.Context(), &models.RainSetting{SessionID: sessionID})
	if err != nil {
		h.SendError(c, web.InternalServerError("Không thể tự động lưu Session ID vào Database: "+err.Error()))
		return
	}

	// Áp dụng ngay cho worker đang chạy
	if h.worker != nil {
		h.worker.SetSessionID(sessionID)
	}

	h.SendData(c, gin.H{
		"session_id": sessionID,
	})
}
