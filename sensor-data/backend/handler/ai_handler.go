package handler

import (
	"sensor-backend/internal/models"
	"sensor-backend/internal/service/ai"

	"github.com/gin-gonic/gin"
)

type AIHandler struct {
	aiService ai.Service
}

func NewAIHandler(aiService ai.Service) *AIHandler {
	return &AIHandler{aiService: aiService}
}

func (h *AIHandler) Chat(c *gin.Context) {
	var req models.ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "invalid request body"})
		return
	}

	response, err := h.aiService.Chat(c.Request.Context(), req.History, req.Message)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, models.ChatResponse{Message: response})
}
