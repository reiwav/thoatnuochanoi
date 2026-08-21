package google

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

func (h *handler) GenerateQuickReport(c *gin.Context) {
	h.GenerateQuickReportV3(c)
}

// GenerateQuickReportV3 godoc
// @Summary Tạo báo cáo nhanh tự động (V3)
// @Description Tổng hợp dữ liệu mưa, mực nước, ngập lụt và trạm bơm vào một báo cáo PDF/Drive duy nhất
// @Tags Tiện ích
// @Produce json
// @Security BearerAuth
// @Success 200 {object} web.Response{data=object}
// @Router /admin/google/quick-report [post]
func (h *handler) GenerateQuickReportV3(c *gin.Context) {
	userID, _ := h.contextWith.GetUserID(c)
	var req struct {
		CustomTime *int64 `json:"customTime"`
	}
	_ = c.ShouldBindJSON(&req)

	var customTimePtr *time.Time
	if req.CustomTime != nil {
		t := time.Unix(*req.CustomTime, 0)
		customTimePtr = &t
	} else if ctStr := c.Query("customTime"); ctStr != "" {
		if ts, err := strconv.ParseInt(ctStr, 10, 64); err == nil {
			t := time.Unix(ts, 0)
			customTimePtr = &t
		}
	}

	result, err := h.reportSvc.GenerateQuickReportV3(c.Request.Context(), userID, customTimePtr)
	if err != nil {
		h.log.GetLogger().Errorf("[GenerateQuickReportV3] Error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success", "data": gin.H{"report_url": result.ReportURL, "docID": result.DocID},
	})
}

func (h *handler) GenerateQuickReportText(c *gin.Context) {
	userID, _ := h.contextWith.GetUserID(c)
	result, err := h.reportSvc.GenerateQuickReportText(c.Request.Context(), userID)
	if err != nil {
		h.log.GetLogger().Errorf("[GenerateQuickReportText] Error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "data": result})
}

func (h *handler) GenerateAIDynamicReport(c *gin.Context) {
	userID, _ := h.contextWith.GetUserID(c)
	result, err := h.reportSvc.GenerateAIDynamicReport(c.Request.Context(), userID)
	if err != nil {
		h.log.GetLogger().Errorf("[GenerateAIDynamicReport] Error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "data": result})
}

// GetWaterReportDetails godoc
// @Summary Lấy chi tiết số liệu báo cáo Sông/Hồ
// @Description Lấy bảng chi tiết so sánh mực nước trước mưa và hiện tại
// @Tags Tiện ích
// @Produce json
// @Security BearerAuth
// @Success 200 {object} web.Response{data=object}
// @Router /admin/google/water-report-details [get]
func (h *handler) GetWaterReportDetails(c *gin.Context) {
	var customTimePtr *time.Time
	if ctStr := c.Query("customTime"); ctStr != "" {
		if ts, err := strconv.ParseInt(ctStr, 10, 64); err == nil {
			t := time.Unix(ts, 0)
			customTimePtr = &t
		}
	}

	result, err := h.reportSvc.GetWaterReportDetails(c.Request.Context(), customTimePtr)
	if err != nil {
		h.log.GetLogger().Errorf("[GetWaterReportDetails] Error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "data": result})
}
