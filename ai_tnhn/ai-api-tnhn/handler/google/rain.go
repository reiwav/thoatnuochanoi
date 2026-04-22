package google

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/googleapi"
	"ai-api-tnhn/utils/web"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
)

// GetRainSummary godoc
// @Summary Lấy tóm tắt lượng mưa cho AI
// @Description Truy xuất dữ liệu tóm tắt lượng mưa có cấu trúc để AI xử lý hoặc hiển thị
// @Tags AI & Giám sát
// @Produce json
// @Security BearerAuth
// @Param is_chat query bool false "Có lưu hành động vào lịch sử chat không"
// @Success 200 {object} web.Response{data=object}
// @Router /admin/google/rain-summary [get]
func (h *handler) GetRainSummary(c *gin.Context) {
	token := h.contextWith.GetTokenFromContext(c)
	orgID := token.OrgID
	if token.IsCompany {
		orgID = ""
	}
	summary, err := h.googleSvc.GetRainSummary(c.Request.Context(), orgID)
	web.AssertNil(err)

	isChat := c.Query("is_chat") == "true"
	if isChat && h.aiChatLogRepo != nil && token.UserID != "" {
		now := time.Now()
		// Save User Query
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: token.UserID, Role: "user", Content: "Tình hình mưa đang như thế nào?", ChatType: "support", Timestamp: now.Add(-1 * time.Second),
		})

		// Format AI Response to match Frontend display
		displayText := h.formatRainSummary(summary)

		// Save AI Response
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: token.UserID, Role: "model", Content: displayText, ChatType: "support", Timestamp: now,
		})
	}

	h.SendData(c, summary)
}

// GetRainSummaryText godoc
// @Summary Lấy tóm tắt lượng mưa (dạng văn bản)
// @Description Truy xuất bản tóm tắt văn bản đã được định dạng sẵn về tình hình mưa hiện tại
// @Tags AI & Giám sát
// @Produce json
// @Security BearerAuth
// @Success 200 {object} web.Response{data=string}
// @Router /admin/google/rain-summary-text [get]
func (h *handler) GetRainSummaryText(c *gin.Context) {
	token := h.contextWith.GetTokenFromContext(c)
	orgID := token.OrgID
	if token.IsCompany {
		orgID = ""
	}
	summary, err := h.googleSvc.GetRainSummary(c.Request.Context(), orgID)
	web.AssertNil(err)

	displayText := h.formatRainSummary(summary)

	// Persist to chat history automatically for this text-specific endpoint
	if h.aiChatLogRepo != nil && token.UserID != "" {
		now := time.Now()
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: token.UserID, Role: "user", Content: "Tình hình mưa đang như thế nào?", ChatType: "support", Timestamp: now.Add(-1 * time.Second),
		})
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: token.UserID, Role: "model", Content: displayText, ChatType: "support", Timestamp: now,
		})
	}

	h.SendData(c, displayText)
}

func (h *handler) formatRainSummary(summary *googleapi.RainSummaryData) string {
	displayText := ""
	if len(summary.Measurements) == 0 {
		return "Hiện tại ghi nhận không có mưa tại tất cả các trạm."
	}

	statusLine := "- Hiện tại không còn mưa"
	if summary.RainyStations > 0 {
		statusLine = fmt.Sprintf("- Số trạm đang có mưa: %d", summary.RainyStations)
	}
	displayText = fmt.Sprintf("Tình hình mưa hiện tại:\n- Tổng số trạm: %d\n%s\n- Trạm mưa lớn nhất trong ngày: %s (%.1fmm)\n\nChi tiết danh sách các trạm có mưa trong ngày:\n",
		summary.TotalStations, statusLine, summary.MaxRainStation.Name, summary.MaxRainStation.TotalRain)
	for _, m := range summary.Measurements {
		status := "✅ Đã tạnh"
		if m.IsRaining {
			status = "⛈️ Đang mưa"
		}
		displayText += fmt.Sprintf("- %s: %.1fmm (%s - %s) [%s]\n", m.Name, m.TotalRain, m.StartTime, m.EndTime, status)
	}
	return displayText
}
