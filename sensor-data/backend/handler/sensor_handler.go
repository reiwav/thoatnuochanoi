package handler

import (
	"sensor-backend/internal/service/sensor"

	"github.com/gin-gonic/gin"
)

type SensorHandler struct {
	sensorService sensor.Service
}

func NewSensorHandler(sensorService sensor.Service) *SensorHandler {
	return &SensorHandler{sensorService: sensorService}
}

func (h *SensorHandler) GetMonitorData(c *gin.Context) {
	link := c.Query("link")
	if link == "" {
		c.JSON(400, gin.H{"error": "link parameter is required"})
		return
	}
	data, err := h.sensorService.GetMonitorData(c.Request.Context(), link)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, data)
}

func (h *SensorHandler) GetAlarms(c *gin.Context) {
	link := c.Query("link")
	if link == "" {
		c.JSON(400, gin.H{"error": "link parameter is required"})
		return
	}
	data, err := h.sensorService.GetAlarms(c.Request.Context(), link)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, data)
}

func (h *SensorHandler) GetHistoryTrend(c *gin.Context) {
	link := c.Query("link")
	channel := c.Query("channel")
	startDate := c.Query("start_date") // Can be empty
	endDate := c.Query("end_date")     // Can be empty

	if link == "" || channel == "" {
		c.JSON(400, gin.H{"error": "link and channel parameters are required"})
		return
	}

	data, err := h.sensorService.GetHistoryTrend(c.Request.Context(), link, channel, startDate, endDate)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, data)
}

func (h *SensorHandler) GetOutputs(c *gin.Context) {
	link := c.Query("link")
	if link == "" {
		c.JSON(400, gin.H{"error": "link parameter is required"})
		return
	}
	
	// auto-seed outputs if not exists for link
	h.sensorService.SeedOutputs(c.Request.Context(), link)
	
	data, err := h.sensorService.GetOutputs(c.Request.Context(), link)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, data)
}

func (h *SensorHandler) ToggleOutput(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		Control bool   `json:"control"`
		Link    string `json:"link"`
	}
	if err := c.ShouldBindJSON(&input); err != nil || input.Link == "" {
		c.JSON(400, gin.H{"error": "Invalid input or missing link"})
		return
	}

	err := h.sensorService.ToggleOutput(c.Request.Context(), input.Link, id, input.Control)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"status": "ok"})
}
