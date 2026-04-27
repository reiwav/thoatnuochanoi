package handler

import (
	"ai-api-tnhn/internal/service/station/rain"
	"ai-api-tnhn/utils/web"
	"strconv"

	"github.com/gin-gonic/gin"
)

type RainHandler struct {
	web.JsonRender
	service rain.Service
}

func NewRainHandler(service rain.Service) *RainHandler {
	return &RainHandler{
		service: service,
	}
}

// GetRainHistory godoc
// @Summary Lấy lịch sử dữ liệu trạm mưa
// @Description Truy xuất dữ liệu mưa lịch sử của một trạm cụ thể
// @Tags Thủy văn
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID trạm"
// @Param limit query int false "Số bản ghi tối đa" default(100)
// @Param date query string false "Lọc theo ngày (YYYY-MM-DD)"
// @Success 200 {object} web.Response{data=[]object}
// @Router /admin/water/rain/{id}/history [get]
func (h *RainHandler) GetRainHistory(c *gin.Context) {
	stationID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	limit, _ := strconv.ParseInt(c.DefaultQuery("limit", "100"), 10, 64)
	date := c.Query("date")

	res, err := h.service.GetRainDataByStation(c.Request.Context(), stationID, limit, date)
	web.AssertNil(err)
	h.SendData(c, res)
}

// GetRainDataByDate godoc
// @Summary Lấy dữ liệu mưa tất cả trạm theo ngày
// @Description Truy xuất dữ liệu mưa của tất cả các trạm trong một ngày cụ thể
// @Tags Thủy văn
// @Produce json
// @Security BearerAuth
// @Param date query string true "Ngày lọc (YYYY-MM-DD)"
// @Success 200 {object} web.Response{data=[]object}
// @Router /admin/water/rain/by-date [get]
func (h *RainHandler) GetRainDataByDate(c *gin.Context) {
	date := c.Query("date") // Expected format: YYYY-MM-DD
	if date == "" {
		c.JSON(400, gin.H{"error": "date query param is required"})
		return
	}

	res, err := h.service.GetRainDataByDate(c.Request.Context(), date)
	web.AssertNil(err)
	h.SendData(c, res)
}

func (h *RainHandler) GetRainChart(c *gin.Context) {
	stationID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	date := c.Query("date")

	res, err := h.service.GetRainChart(c.Request.Context(), stationID, date)
	web.AssertNil(err)
	h.SendData(c, res)
}
