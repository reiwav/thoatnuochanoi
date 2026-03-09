package handler

import (
	"ai-api-tnhn/internal/service/weather"
	"net/http"

	"github.com/gin-gonic/gin"
)

type WeatherHandler struct {
	weatherSvc weather.Service
}

func NewWeatherHandler(weatherSvc weather.Service) *WeatherHandler {
	return &WeatherHandler{
		weatherSvc: weatherSvc,
	}
}

func (h *WeatherHandler) GetRainSummary(c *gin.Context) {
	data, err := h.weatherSvc.GetRawRainData(c.Request.Context())
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
