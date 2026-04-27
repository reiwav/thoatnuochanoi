package handler

import (
	"ai-api-tnhn/internal/service/station/water"
	"ai-api-tnhn/utils/web"
	"strconv"

	"github.com/gin-gonic/gin"
)

type WaterHandler struct {
	web.JsonRender
	service water.Service
}

func NewWaterHandler(service water.Service) *WaterHandler {
	return &WaterHandler{
		service: service,
	}
}

// GetLakeHistory godoc
// @Summary Lấy lịch sử dữ liệu trạm hồ
// @Description Truy xuất dữ liệu mực nước hồ lịch sử của một trạm cụ thể
// @Tags Thủy văn
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID trạm"
// @Param limit query int false "Số bản ghi tối đa" default(100)
// @Param date query string false "Lọc theo ngày (YYYY-MM-DD)"
// @Success 200 {object} web.Response{data=[]object}
// @Router /admin/water/lake/{id}/history [get]
func (h *WaterHandler) GetLakeHistory(c *gin.Context) {
	stationID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	limit, _ := strconv.ParseInt(c.DefaultQuery("limit", "100"), 10, 64)
	date := c.Query("date")

	res, err := h.service.GetLakeDataByStation(c.Request.Context(), stationID, limit, date)
	web.AssertNil(err)
	h.SendData(c, res)
}

// GetRiverHistory godoc
// @Summary Lấy lịch sử dữ liệu trạm sông
// @Description Truy xuất dữ liệu mực nước sông lịch sử của một trạm cụ thể
// @Tags Thủy văn
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID trạm"
// @Param limit query int false "Số bản ghi tối đa" default(100)
// @Param date query string false "Lọc theo ngày (YYYY-MM-DD)"
// @Success 200 {object} web.Response{data=[]object}
// @Router /admin/water/river/{id}/history [get]
func (h *WaterHandler) GetRiverHistory(c *gin.Context) {
	stationID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	limit, _ := strconv.ParseInt(c.DefaultQuery("limit", "100"), 10, 64)
	date := c.Query("date")

	res, err := h.service.GetRiverDataByStation(c.Request.Context(), stationID, limit, date)
	web.AssertNil(err)
	h.SendData(c, res)
}
