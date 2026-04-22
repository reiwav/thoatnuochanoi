package google

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/utils/web"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// GetEmailDetail godoc
// @Summary Lấy thông tin chi tiết email
// @Description Truy xuất toàn bộ nội dung và tệp đính kèm của một tin nhắn Gmail cụ thể
// @Tags Tiện ích
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID Email (uint32)"
// @Success 200 {object} web.Response{data=object}
// @Router /admin/google/email/{id} [get]
func (h *handler) GetEmailDetail(c *gin.Context) {
	idStr := c.Param("id")
	var id uint32
	_, err := fmt.Sscanf(idStr, "%d", &id)
	if err != nil {
		web.AssertNil(web.BadRequest("ID email không hợp lệ"))
		return
	}

	detail, err := h.googleSvc.ReadEmailByID(c.Request.Context(), id)
	web.AssertNil(err)

	// Persist to chat history as an AI response (since this is a detail view action)
	userID, _ := h.contextWith.GetUserID(c)
	if h.aiChatLogRepo != nil && userID != "" {
		now := time.Now()
		attachmentsText := ""
		if len(detail.Attachments) > 0 {
			attachmentsText = "\n\n**File đính kèm:**\n"
			for _, a := range detail.Attachments {
				attachmentsText += fmt.Sprintf("- [%s](%s)\n", a.Filename, a.URL)
			}
		}
		content := fmt.Sprintf("### %s\n**Từ:** %s\n**Ngày:** %s\n\n%s%s", detail.Subject, detail.From, detail.Date, detail.Body, attachmentsText)

		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: userID, Role: "model", Content: content, ChatType: "support", Timestamp: now,
		})
	}

	h.SendData(c, detail)
}

// GetRecentEmails godoc
// @Summary Lấy các email gần đây
// @Description Truy xuất danh sách 10 email gần đây nhất từ hòm thư thời tiết
// @Tags Tiện ích
// @Produce json
// @Security BearerAuth
// @Success 200 {object} web.Response{data=[]object}
// @Router /admin/google/emails/recent [get]
func (h *handler) GetRecentEmails(c *gin.Context) {
	emails, err := h.googleSvc.GetRecentEmails(c.Request.Context(), 10)
	web.AssertNil(err)

	// Persist to chat history
	userID, _ := h.contextWith.GetUserID(c)
	if h.aiChatLogRepo != nil && userID != "" {
		now := time.Now()
		// Save User Query
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: userID, Role: "user", Content: "Xem 10 email gần đây", ChatType: "support", Timestamp: now.Add(-1 * time.Second),
		})

		// Build table text similar to index.jsx
		tableText := "### Danh sách 10 email gần đây\n\n"
		if len(emails) == 0 {
			tableText += "Không tìm thấy email nào."
		} else {
			tableText += "| Người gửi | Tiêu đề | Thời gian | Thao tác |\n"
			tableText += "| :--- | :--- | :--- | :--- |\n"
			for _, m := range emails {
				tableText += fmt.Sprintf("| %s | %s | %s | [Xem chi tiết](#email-detail-%d) |\n", m.From, m.Subject, m.Date, m.ID)
			}
		}

		// Save AI Response
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: userID, Role: "model", Content: tableText, ChatType: "support", Timestamp: now,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   emails,
	})
}

// GetUnreadEmails godoc
// @Summary Lấy các email chưa đọc
// @Description Truy xuất danh sách 10 email chưa đọc gần đây nhất
// @Tags Tiện ích
// @Produce json
// @Security BearerAuth
// @Success 200 {object} web.Response{data=[]object}
// @Router /admin/google/emails/unread [get]
func (h *handler) GetUnreadEmails(c *gin.Context) {
	emails, err := h.googleSvc.GetUnreadEmails(c.Request.Context(), 10)
	web.AssertNil(err)

	// Persist to chat history
	userID, _ := h.contextWith.GetUserID(c)
	if h.aiChatLogRepo != nil && userID != "" {
		now := time.Now()
		// Save User Query
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: userID, Role: "user", Content: "Xem 10 email mới nhất", ChatType: "support", Timestamp: now.Add(-1 * time.Second),
		})

		// Build table text
		tableText := "### Danh sách 10 email mới nhất\n\n"
		if len(emails) == 0 {
			tableText += "Không tìm thấy email nào."
		} else {
			tableText += "| Người gửi | Tiêu đề | Thời gian | Thao tác |\n"
			tableText += "| :--- | :--- | :--- | :--- |\n"
			for _, m := range emails {
				tableText += fmt.Sprintf("| %s | %s | %s | [Xem chi tiết](#email-detail-%d) |\n", m.From, m.Subject, m.Date, m.ID)
			}
		}

		// Save AI Response
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: userID, Role: "model", Content: tableText, ChatType: "support", Timestamp: now,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   emails,
	})
}
