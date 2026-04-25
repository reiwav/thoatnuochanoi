package google

import (
	"ai-api-tnhn/internal/service/google/googleapi"
	"ai-api-tnhn/utils/web"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
)

// ChatContract godoc
// @Summary Chat với Gemini về hợp đồng
// @Description Chat AI hỗ trợ phân tích và truy xuất thông tin hợp đồng
// @Tags AI Chat
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body object{prompt=string,history=[]object} true "Câu hỏi và lịch sử chat"
// @Success 200 {object} web.Response{data=string}
// @Router /admin/google/contract-chat [post]
func (h *handler) ChatContract(c *gin.Context) {
	if h.geminiSvc == nil {
		web.AssertNil(web.InternalServerError("Gemini AI service is not initialized. Please check GEMINI_API_KEY."))
		return
	}

	var body struct {
		Prompt  string               `json:"prompt"`
		History []googleapi.ChatMessage `json:"history"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		web.AssertNil(web.BadRequest("prompt is required"))
		return
	}

	token := h.contextWith.GetTokenFromContext(c)
	response, err := h.geminiSvc.ChatContract(c.Request.Context(), body.Prompt, body.History, token.UserID, token.IsCompany, "")
	web.AssertNil(err)
	h.SendData(c, response)
}

// Chat godoc
// @Summary Chat với AI Gemini
// @Description Trợ lý ảo đa năng hỗ trợ công việc vận hành bởi Gemini
// @Tags AI Chat
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body object{prompt=string,history=[]object} true "Câu hỏi và lịch sử chat"
// @Success 200 {object} web.Response{data=string}
// @Router /admin/google/chat [post]
func (h *handler) Chat(c *gin.Context) {
	var body struct {
		Prompt  string               `json:"prompt"`
		History []googleapi.ChatMessage `json:"history"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	token := h.contextWith.GetTokenFromContext(c)
	fmt.Printf(" [Chat Handler] UserID: %s, Prompt length: %d\n", token.UserID, len(body.Prompt))
	response, err := h.geminiSvc.Chat(c.Request.Context(), body.Prompt, body.History, token.UserID, token.IsCompany, "")
	web.AssertNil(err)
	h.SendData(c, response)
}

// GetChatHistory godoc
// @Summary Lấy lịch sử chat AI
// @Description Truy xuất các bản ghi lịch sử chat của người dùng hiện tại
// @Tags AI Chat
// @Produce json
// @Security BearerAuth
// @Param chat_type query string false "Loại chat (support/contract)" default(support)
// @Param limit query int false "Số lượng bản ghi" default(50)
// @Param before query string false "Mốc thời gian ISO-8601 để phân trang"
// @Success 200 {object} web.Response{data=[]models.AiChatLog}
// @Router /admin/google/chat/history [get]
func (h *handler) GetChatHistory(c *gin.Context) {
	userID, _ := h.contextWith.GetUserID(c)
	chatType := c.DefaultQuery("chat_type", "support")
	limitStr := c.DefaultQuery("limit", "50")
	beforeStr := c.Query("before")

	var limit int
	fmt.Sscanf(limitStr, "%d", &limit)

	var before time.Time
	if beforeStr != "" {
		// Attempt to parse RFC3339
		parsed, err := time.Parse(time.RFC3339, beforeStr)
		if err == nil {
			before = parsed
		} else {
			// Fallback to Unix timestamp if it's numeric
			var unix int64
			if _, err := fmt.Sscanf(beforeStr, "%d", &unix); err == nil {
				before = time.Unix(unix, 0)
			}
		}
	}

	fmt.Printf(" [Chat History Handler] UserID: %s, ChatType: %s, Limit: %d, Before: %v\n", userID, chatType, limit, before)
	logs, err := h.aiChatLogRepo.FindByUser(c.Request.Context(), userID, chatType, limit, before)
	web.AssertNil(err)

	// Reverse to send oldest first for the frontend to render sequentially
	for i, j := 0, len(logs)-1; i < j; i, j = i+1, j-1 {
		logs[i], logs[j] = logs[j], logs[i]
	}

	h.SendData(c, logs)
}
