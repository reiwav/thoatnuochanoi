package google

import (
	"ai-api-tnhn/utils/web"

	"github.com/gin-gonic/gin"
)

// GetWeatherForecast godoc
// @Summary Lấy dự báo thời tiết
// @Description Truy xuất dữ liệu dự báo thời tiết truyền thống
// @Tags AI & Dự báo
// @Produce json
// @Security BearerAuth
// @Success 200 {object} web.Response{data=object}
// @Router /admin/google/weather/forecast [get]
func (h *handler) GetWeatherForecast(c *gin.Context) {
	forecast, err := h.weatherSvc.GetForecast(c.Request.Context())
	web.AssertNil(err)
	h.SendData(c, forecast)
}

// GetGeminiWeatherForecast godoc
// @Summary Lấy dự báo thời tiết từ AI Gemini
// @Description Truy xuất dữ liệu dự báo thời tiết được tăng cường bởi AI Gemini
// @Tags AI & Dự báo
// @Produce json
// @Security BearerAuth
// @Success 200 {object} web.Response{data=object}
// @Router /admin/google/weather/forecast/gemini [get]
func (h *handler) GetGeminiWeatherForecast(c *gin.Context) {
	forecast, err := h.weatherSvc.GetGeminiForecast(c.Request.Context())
	web.AssertNil(err)
	h.SendData(c, forecast)
}
