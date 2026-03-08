package handler

import (
	"ai-api-tnhn/internal/service/water"
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

func (h *WaterHandler) GetRainHistory(c *gin.Context) {
	stationID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	limit, _ := strconv.ParseInt(c.DefaultQuery("limit", "100"), 10, 64)
	date := c.Query("date")

	res, err := h.service.GetRainDataByStation(c.Request.Context(), stationID, limit, date)
	web.AssertNil(err)
	h.SendData(c, res)
}

func (h *WaterHandler) GetLakeHistory(c *gin.Context) {
	stationID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	limit, _ := strconv.ParseInt(c.DefaultQuery("limit", "100"), 10, 64)
	date := c.Query("date")

	res, err := h.service.GetLakeDataByStation(c.Request.Context(), stationID, limit, date)
	web.AssertNil(err)
	h.SendData(c, res)
}

func (h *WaterHandler) GetRiverHistory(c *gin.Context) {
	stationID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	limit, _ := strconv.ParseInt(c.DefaultQuery("limit", "100"), 10, 64)
	date := c.Query("date")

	res, err := h.service.GetRiverDataByStation(c.Request.Context(), stationID, limit, date)
	web.AssertNil(err)
	h.SendData(c, res)
}

func (h *WaterHandler) GetRainDataByDate(c *gin.Context) {
	date := c.Query("date") // Expected format: YYYY-MM-DD
	if date == "" {
		c.JSON(400, gin.H{"error": "date query param is required"})
		return
	}

	res, err := h.service.GetRainDataByDate(c.Request.Context(), date)
	web.AssertNil(err)
	h.SendData(c, res)
}
