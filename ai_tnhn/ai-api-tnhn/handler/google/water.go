package google

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/utils/web"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
)

// GetWaterSummary godoc
// @Summary Lấy tóm tắt mực nước cho AI
// @Description Truy xuất dữ liệu mực nước có cấu trúc để AI xử lý
// @Tags AI & Giám sát
// @Produce json
// @Security BearerAuth
// @Success 200 {object} web.Response{data=object}
// @Router /admin/google/water-summary [get]
func (h *handler) GetWaterSummary(c *gin.Context) {
	token := h.contextWith.GetTokenFromContext(c)
	orgID := token.OrgID
	if token.IsCompany {
		orgID = ""
	}
	summary, err := h.googleSvc.GetWaterSummary(c.Request.Context(), orgID, nil)
	web.AssertNil(err)

	// Persist to chat history
	userID, _ := h.contextWith.GetUserID(c)
	if h.aiChatLogRepo != nil && userID != "" {
		now := time.Now()
		// Save User Query
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: userID, Role: "user", Content: "Tình hình mực nước sông, hồ?", ChatType: "support", Timestamp: now.Add(-1 * time.Second),
		})

		// Format AI Response
		displayText := "### Tình hình mực nước hiện tại\n\n"
		if len(summary.LakeStations) > 0 {
			displayText += "#### Hồ:\n"
			for _, s := range summary.LakeStations {
				displayText += fmt.Sprintf("- %s: %.2fm (%s)\n", s.Name, s.Level/100.0, s.ThoiGian)
			}
		}
		if len(summary.RiverStations) > 0 {
			displayText += "\n#### Sông:\n"
			for _, s := range summary.RiverStations {
				displayText += fmt.Sprintf("- %s: %.2fm (%s)\n", s.Name, s.Level/100.0, s.ThoiGian)
			}
		}

		// Save AI Response
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: userID, Role: "model", Content: displayText, ChatType: "support", Timestamp: now,
		})
	}

	h.SendData(c, summary)
}
