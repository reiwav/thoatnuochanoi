package handler

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/station/water"
	"ai-api-tnhn/utils/web"
	"strconv"

	"github.com/gin-gonic/gin"
)

type WaterHandler struct {
	web.JsonRender
	service     water.Service
	contextWith web.ContextWith
}

func NewWaterHandler(service water.Service, contextWith web.ContextWith) *WaterHandler {
	return &WaterHandler{
		service:     service,
		contextWith: contextWith,
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

// ReportLake godoc
// @Summary Nhân viên cập nhật mực nước hồ
// @Tags Thủy văn
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID trạm hồ"
// @Param report body object true "Giá trị mực nước"
// @Success 200 {boolean} bool
// @Router /admin/water/lake/{id}/report [post]
func (h *WaterHandler) ReportLake(c *gin.Context) {
	stationID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
		h.SendError(c, web.Unauthorized("vui lòng đăng nhập lại"))
		return
	}

	var req struct {
		Value float64 `json:"value"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		h.SendError(c, web.BadRequest(err.Error()))
		return
	}

	record := &models.LakeRecord{
		StationID: stationID,
		Value:     req.Value,
	}

	err = h.service.CreateLakeRecord(c.Request.Context(), record, user)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}

// ReportRiver godoc
// @Summary Nhân viên cập nhật mực nước sông
// @Tags Thủy văn
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID trạm sông"
// @Param report body object true "Giá trị mực nước"
// @Success 200 {boolean} bool
// @Router /admin/water/river/{id}/report [post]
func (h *WaterHandler) ReportRiver(c *gin.Context) {
	stationID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
		h.SendError(c, web.Unauthorized("vui lòng đăng nhập lại"))
		return
	}

	var req struct {
		Value float64 `json:"value"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		h.SendError(c, web.BadRequest(err.Error()))
		return
	}

	record := &models.RiverRecord{
		StationID: stationID,
		Value:     req.Value,
	}

	err = h.service.CreateRiverRecord(c.Request.Context(), record, user)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}
