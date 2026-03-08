package handler

import (
	"ai-api-tnhn/handler/filters"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/station"
	"ai-api-tnhn/utils/web"

	"github.com/gin-gonic/gin"
)

type StationHandler struct {
	web.JsonRender
	service station.Service
}

func NewStationHandler(service station.Service) *StationHandler {
	return &StationHandler{
		service: service,
	}
}

// RAIN STATIONS
func (h *StationHandler) CreateRain(c *gin.Context) {
	var m models.RainStation
	if err := c.ShouldBindJSON(&m); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}
	res, err := h.service.CreateRainStation(c.Request.Context(), &m)
	web.AssertNil(err)
	h.SendData(c, res)
}

func (h *StationHandler) UpdateRain(c *gin.Context) {
	id := c.Param("id")
	var m models.RainStation
	if err := c.ShouldBindJSON(&m); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}
	err := h.service.UpdateRainStation(c.Request.Context(), id, &m)
	web.AssertNil(err)
	h.SendData(c, m)
}

func (h *StationHandler) DeleteRain(c *gin.Context) {
	id := c.Param("id")
	err := h.service.DeleteRainStation(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, nil)
}

func (h *StationHandler) GetRainByID(c *gin.Context) {
	id := c.Param("id")
	res, err := h.service.GetRainStation(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, res)
}

func (h *StationHandler) ListRain(c *gin.Context) {
	req := filters.NewStationListRequest()
	if err := c.ShouldBindQuery(req); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}
	items, total, err := h.service.ListRainStations(c.Request.Context(), req)
	web.AssertNil(err)
	h.SendData(c, gin.H{"data": items, "total": total})
}

// LAKE STATIONS
func (h *StationHandler) CreateLake(c *gin.Context) {
	var m models.LakeStation
	if err := c.ShouldBindJSON(&m); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}
	res, err := h.service.CreateLakeStation(c.Request.Context(), &m)
	web.AssertNil(err)
	h.SendData(c, res)
}

func (h *StationHandler) UpdateLake(c *gin.Context) {
	id := c.Param("id")
	var m models.LakeStation
	if err := c.ShouldBindJSON(&m); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}
	err := h.service.UpdateLakeStation(c.Request.Context(), id, &m)
	web.AssertNil(err)
	h.SendData(c, m)
}

func (h *StationHandler) DeleteLake(c *gin.Context) {
	id := c.Param("id")
	err := h.service.DeleteLakeStation(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, nil)
}

func (h *StationHandler) GetLakeByID(c *gin.Context) {
	id := c.Param("id")
	res, err := h.service.GetLakeStation(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, res)
}

func (h *StationHandler) ListLake(c *gin.Context) {
	req := filters.NewStationListRequest()
	if err := c.ShouldBindQuery(req); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}
	items, total, err := h.service.ListLakeStations(c.Request.Context(), req)
	web.AssertNil(err)
	h.SendData(c, gin.H{"data": items, "total": total})
}

// RIVER STATIONS
func (h *StationHandler) CreateRiver(c *gin.Context) {
	var m models.RiverStation
	if err := c.ShouldBindJSON(&m); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}
	res, err := h.service.CreateRiverStation(c.Request.Context(), &m)
	web.AssertNil(err)
	h.SendData(c, res)
}

func (h *StationHandler) UpdateRiver(c *gin.Context) {
	id := c.Param("id")
	var m models.RiverStation
	if err := c.ShouldBindJSON(&m); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}
	err := h.service.UpdateRiverStation(c.Request.Context(), id, &m)
	web.AssertNil(err)
	h.SendData(c, m)
}

func (h *StationHandler) DeleteRiver(c *gin.Context) {
	id := c.Param("id")
	err := h.service.DeleteRiverStation(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, nil)
}

func (h *StationHandler) GetRiverByID(c *gin.Context) {
	id := c.Param("id")
	res, err := h.service.GetRiverStation(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, res)
}

func (h *StationHandler) ListRiver(c *gin.Context) {
	req := filters.NewStationListRequest()
	if err := c.ShouldBindQuery(req); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}
	items, total, err := h.service.ListRiverStations(c.Request.Context(), req)
	web.AssertNil(err)
	h.SendData(c, gin.H{"data": items, "total": total})
}
