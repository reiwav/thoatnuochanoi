package handler

import (
	"ai-api-tnhn/internal/service/query"
	"net/http"

	"github.com/gin-gonic/gin"
)

type QueryHandler struct {
	querySvc query.Service
}

func NewQueryHandler(querySvc query.Service) *QueryHandler {
	return &QueryHandler{querySvc: querySvc}
}

func (h *QueryHandler) Query(c *gin.Context) {
	var body struct {
		Collection string                 `json:"collection" binding:"required"`
		Filter     map[string]interface{} `json:"filter"`
		Limit      int64                  `json:"limit"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "vui lòng cung cấp collection và filter hợp lệ"})
		return
	}

	results, err := h.querySvc.Query(c.Request.Context(), body.Collection, body.Filter, body.Limit)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"count":  len(results),
		"data":   results,
	})
}
