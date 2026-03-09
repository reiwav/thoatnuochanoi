package handler

import (
	"ai-api-tnhn/internal/service/weather"
	"net/http"
	"strconv"

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
