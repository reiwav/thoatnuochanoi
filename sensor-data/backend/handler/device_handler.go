package handler

import (
	"sensor-backend/internal/models"
	"sensor-backend/internal/service/device"

	"github.com/gin-gonic/gin"
)

type DeviceHandler struct {
	deviceSvc device.Service
}

func NewDeviceHandler(deviceSvc device.Service) *DeviceHandler {
	return &DeviceHandler{deviceSvc: deviceSvc}
}

func (h *DeviceHandler) GetDevices(c *gin.Context) {
	devices := h.deviceSvc.GetDevices()
	c.JSON(200, devices)
}

func (h *DeviceHandler) UpdateDeviceConfig(c *gin.Context) {
	id := c.Param("id")
	var config []models.DeviceConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(400, gin.H{"error": "Invalid input"})
		return
	}

	err := h.deviceSvc.UpdateDeviceConfig(c.Request.Context(), id, config)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"status": "ok"})
}
