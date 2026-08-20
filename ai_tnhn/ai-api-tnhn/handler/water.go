package handler

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/station/water"
	"ai-api-tnhn/utils/web"
	"strconv"
	"time"

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
		Value     float64   `json:"value"`
		Timestamp time.Time `json:"timestamp"`
		Note      string    `json:"note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		h.SendError(c, web.BadRequest(err.Error()))
		return
	}

	record := &models.LakeRecord{
		StationID: stationID,
		Value:     req.Value,
		Timestamp: req.Timestamp,
		Note:      req.Note,
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
		Value     float64   `json:"value"`
		Timestamp time.Time `json:"timestamp"`
		Note      string    `json:"note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		h.SendError(c, web.BadRequest(err.Error()))
		return
	}

	record := &models.RiverRecord{
		StationID: stationID,
		Value:     req.Value,
		Timestamp: req.Timestamp,
		Note:      req.Note,
	}

	err = h.service.CreateRiverRecord(c.Request.Context(), record, user)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}

// GetWaterSummaryV2 godoc
// @Summary Lấy tổng hợp mực nước sông hồ V2 từ DB
// @Description Truy xuất dữ liệu mực nước hiện tại được báo cáo bởi nhân viên từ database
// @Tags Thủy văn
// @Produce json
// @Security BearerAuth
// @Success 200 {object} web.Response{data=object}
// @Router /admin/water/summary-v2 [get]
func (h *WaterHandler) GetWaterSummaryV2(c *gin.Context) {
	res, err := h.service.GetWaterSummaryV2(c.Request.Context())
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, res)
}


// GetGridData godoc
// @Summary Lấy lịch sử dữ liệu Grid theo khoảng thời gian hoặc ngày
// @Description Lấy toàn bộ dữ liệu lịch sử mực nước của sông, hồ theo khoảng thời gian (start_time, end_time) hoặc ngày (date)
// @Tags Thủy văn
// @Produce json
// @Security BearerAuth
// @Param start_time query string false "Thời gian bắt đầu (ISO8601 / RFC3339)"
// @Param end_time query string false "Thời gian kết thúc (ISO8601 / RFC3339)"
// @Param date query string false "Ngày truy vấn (YYYY-MM-DD)"
// @Success 200 {object} web.Response{data=[]water.GridDataResponseItem}
// @Router /admin/water/grid-data [get]
func (h *WaterHandler) GetGridData(c *gin.Context) {
	date := c.Query("date")
	startTimeStr := c.Query("start_time")
	if startTimeStr == "" {
		startTimeStr = c.Query("start")
	}
	endTimeStr := c.Query("end_time")
	if endTimeStr == "" {
		endTimeStr = c.Query("end")
	}

	var startTime, endTime time.Time
	if startTimeStr != "" {
		if t, err := time.Parse(time.RFC3339, startTimeStr); err == nil {
			startTime = t
		} else if t, err := time.Parse("2006-01-02T15:04:05", startTimeStr); err == nil {
			startTime = t
		} else if t, err := time.Parse("2006-01-02 15:04:05", startTimeStr); err == nil {
			startTime = t
		}
	}
	if endTimeStr != "" {
		if t, err := time.Parse(time.RFC3339, endTimeStr); err == nil {
			endTime = t
		} else if t, err := time.Parse("2006-01-02T15:04:05", endTimeStr); err == nil {
			endTime = t
		} else if t, err := time.Parse("2006-01-02 15:04:05", endTimeStr); err == nil {
			endTime = t
		}
	}

	if date == "" && startTime.IsZero() && endTime.IsZero() {
		h.SendError(c, web.BadRequest("Vui lòng cung cấp date hoặc start_time & end_time"))
		return
	}

	res, err := h.service.GetGridDataByTimeRange(c.Request.Context(), startTime, endTime, date)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, res)
}

// UpsertSingleRecord godoc
// @Summary Thêm mới hoặc cập nhật 1 bản ghi mực nước Grid
// @Description Thêm mới hoặc cập nhật 1 chỉ số mực nước của sông/hồ theo mốc thời gian
// @Tags Thủy văn
// @Accept json
// @Produce json
// @Security BearerAuth
// @Router /admin/water/grid-data/single [post]
func (h *WaterHandler) UpsertSingleRecord(c *gin.Context) {
	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
		h.SendError(c, web.Unauthorized("vui lòng đăng nhập lại"))
		return
	}

	var req water.SingleWaterRecordInput
	if err := c.ShouldBindJSON(&req); err != nil {
		h.SendError(c, web.BadRequest(err.Error()))
		return
	}

	recordID, err := h.service.UpsertSingleWaterRecord(c.Request.Context(), &req, user)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, map[string]string{"record_id": recordID})
}
