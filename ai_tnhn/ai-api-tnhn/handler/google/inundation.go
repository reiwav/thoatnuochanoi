package google

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/utils/web"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
)

// GetInundationSummary godoc
// @Summary Lấy tóm tắt ngập lụt cho AI
// @Description Truy xuất các điểm nóng và trạng thái ngập lụt hiện tại cho AI
// @Tags AI & Giám sát
// @Produce json
// @Security BearerAuth
// @Success 200 {object} web.Response{data=object}
// @Router /admin/google/inundation-summary [get]
func (h *handler) GetInundationSummary(c *gin.Context) {
	token := h.contextWith.GetTokenFromContext(c)
	orgID := token.OrgID
	if token.IsCompany {
		orgID = ""
	}
	isAllowedAll := token.IsCompany || token.Role == "Super Admin" || token.Role == "Manager"
	summary, err := h.googleSvc.GetInundationSummary(c.Request.Context(), orgID, isAllowedAll, nil)
	web.AssertNil(err)

	// Persist to chat history
	userID, _ := h.contextWith.GetUserID(c)
	if h.aiChatLogRepo != nil && userID != "" {
		now := time.Now()
		// Save User Query
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: userID, Role: "user", Content: "Những điểm đang ngập?", ChatType: "support", Timestamp: now.Add(-1 * time.Second),
		})

		// Format AI Response
		displayText := ""
		if summary.ActivePoints == 0 {
			displayText = "Hiện tại không có điểm ngập nào trên toàn thành phố."
		} else {
			displayText = fmt.Sprintf("Hiện có **%d** điểm đang ngập:\n\n", summary.ActivePoints)
			for _, p := range summary.OngoingPoints {
				displayText += fmt.Sprintf("- **%s**: %.2f (quản lý: %s)\n  *Bắt đầu:* %s\n", p.StreetName, p.Depth, p.OrgName, p.StartTime)
				if p.Description != "" {
					displayText += fmt.Sprintf("  *Mô tả:* %s\n", p.Description)
				}
			}
		}

		// Save AI Response
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: userID, Role: "model", Content: displayText, ChatType: "support", Timestamp: now,
		})
	}

	h.SendData(c, summary)
}
