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

// Query godoc
// @Summary Truy vấn MongoDB linh hoạt
// @Description Thực hiện truy vấn linh hoạt trên một collection được chỉ định với các bộ lọc tùy chọn
// @Tags Tiện ích
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param query body object{collection=string,filter=object,limit=int} true "Tham số truy vấn"
// @Success 200 {object} object{status=string,count=int,data=[]object}
// @Failure 400 {object} web.ErrorResponse
// @Failure 403 {object} web.ErrorResponse
// @Router /admin/database/query [post]
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
