package handler

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/google/googleapi"
	"ai-api-tnhn/internal/service/weather"
	"ai-api-tnhn/internal/utils"
	"ai-api-tnhn/utils/web"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type WeatherHandler struct {
	weatherSvc    weather.Service
	aiChatLogRepo repository.AiChatLog
	contextWith   web.ContextWith
}

func NewWeatherHandler(weatherSvc weather.Service, aiChatLogRepo repository.AiChatLog, contextWith web.ContextWith) *WeatherHandler {
	return &WeatherHandler{
		weatherSvc:    weatherSvc,
		aiChatLogRepo: aiChatLogRepo,
		contextWith:   contextWith,
	}
}

// GetRainSummary godoc
// @Summary Lấy tổng hợp lượng mưa hiện tại
// @Description Truy xuất dữ liệu lượng mưa hiện tại của tất cả các trạm quan trắc
// @Tags Thời tiết
// @Produce json
// @Security BearerAuth
// @Success 200 {object} web.Response{data=object}
// @Failure 500 {object} web.ErrorResponse
// @Router /admin/weather/rain [get]
func (h *WeatherHandler) GetRainSummary(c *gin.Context) {
	data, err := h.weatherSvc.GetRawRainData(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	summary, errSum := h.weatherSvc.GetRainSummary(c.Request.Context(), "", nil)
	if errSum != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": errSum.Error()})
		return
	}

	rainDate := utils.CurrentRainDate()

	items := []googleapi.RainTableRow{}
	for i, m := range summary.Measurements {
		items = append(items, googleapi.NewRainTableRow(i+1, m.ID, m.OldID, m.Name, m.Address, m.Type, m.Priority, m.TotalRain, m.IsRaining, m.StartTime, m.EndTime, rainDate))
	}

	if h.aiChatLogRepo != nil && h.contextWith != nil {
		if userID, err := h.contextWith.GetUserID(c); err == nil && userID != "" {
			now := time.Now()
			ctx := context.Background()

			// Save user prompt
			_ = h.aiChatLogRepo.Save(ctx, &models.AiChatLog{
				UserID:    userID,
				Role:      "user",
				Content:   "Biểu đồ mưa hiện tại",
				ChatType:  "support",
				Timestamp: now.Add(-1 * time.Second),
			})

			// Save AI response matching frontend format
			aiText := fmt.Sprintf("Hệ thống ghi nhận %d trạm đang có mưa trong ngày. Click vào trạm để xem biểu đồ chi tiết:\n\n[TABLE:rains]", len(items))
			if len(items) == 0 {
				aiText = summary.SummaryText
			}

			chatRes := &googleapi.ChatResponse{
				Text: aiText,
				Tables: map[string]interface{}{
					"rains": items,
				},
			}
			resBytes, _ := json.Marshal(chatRes)

			_ = h.aiChatLogRepo.Save(ctx, &models.AiChatLog{
				UserID:    userID,
				Role:      "model",
				Content:   string(resBytes),
				ChatType:  "support",
				Timestamp: now,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": map[string]interface{}{
			"tram":    data.Content.Tram,
			"data":    data.Content.Data,
			"items":   items,
			"summary": summary.SummaryText,
		},
	})
}

// GetWaterSummary godoc
// @Summary Lấy tổng hợp mực nước hiện tại
// @Description Truy xuất dữ liệu mực nước hiện tại của tất cả các trạm quan trắc
// @Tags Thời tiết
// @Produce json
// @Security BearerAuth
// @Success 200 {object} web.Response{data=object}
// @Failure 500 {object} web.ErrorResponse
// @Router /admin/weather/water [get]
func (h *WeatherHandler) GetWaterSummary(c *gin.Context) {
	data, err := h.weatherSvc.GetRawWaterData(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": map[string]interface{}{
			"tram": data.Content.Tram,
			"data": data.Content.Data,
		},
	})
}

// GetHistoricalRain godoc
// @Summary Lấy dữ liệu lịch sử lượng mưa
// @Description Truy xuất dữ liệu lượng mưa lịch sử của tất cả các trạm
// @Tags Thời tiết
// @Produce json
// @Security BearerAuth
// @Success 200 {object} web.Response{data=object}
// @Failure 500 {object} web.ErrorResponse
// @Router /admin/weather/rain/history [get]
func (h *WeatherHandler) GetHistoricalRain(c *gin.Context) {
	data, err := h.weatherSvc.GetHistoricalRainData(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   data,
	})
}

// GetComparisonReport godoc
// @Summary Báo cáo so sánh lượng mưa giữa hai năm
// @Description Truy xuất báo cáo so sánh dữ liệu lượng mưa giữa hai năm cụ thể
// @Tags Thời tiết
// @Produce json
// @Security BearerAuth
// @Param year1 query int true "Năm thứ nhất"
// @Param year2 query int true "Năm thứ hai"
// @Success 200 {object} web.Response{data=object}
// @Failure 400 {object} web.ErrorResponse
// @Failure 500 {object} web.ErrorResponse
// @Router /admin/weather/rain/comparison [get]
func (h *WeatherHandler) GetComparisonReport(c *gin.Context) {
	year1Str := c.Query("year1")
	year2Str := c.Query("year2")

	year1, _ := strconv.Atoi(year1Str)
	year2, _ := strconv.Atoi(year2Str)

	if year1 == 0 || year2 == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid years provided"})
		return
	}

	data, err := h.weatherSvc.GetComparisonData(c.Request.Context(), year1, year2)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   data,
	})
}
