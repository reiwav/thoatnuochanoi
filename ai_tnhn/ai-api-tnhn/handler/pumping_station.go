package handler

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/auth"
	pumpingstation "ai-api-tnhn/internal/service/pumping_station"
	"ai-api-tnhn/utils/web"
	"strconv"

	"github.com/gin-gonic/gin"
)

type PumpingStationHandler struct {
	web.JsonRender
	service     pumpingstation.Service
	authService auth.Service
	contextWith web.ContextWith
}

func NewPumpingStationHandler(service pumpingstation.Service, authService auth.Service, contextWith web.ContextWith) *PumpingStationHandler {
	return &PumpingStationHandler{
		service:     service,
		authService: authService,
		contextWith: contextWith,
	}
}

func (h *PumpingStationHandler) Create(c *gin.Context) {
	var req models.PumpingStation
	if err := c.ShouldBindJSON(&req); err != nil {
		h.SendError(c, web.BadRequest(err.Error()))
		return
	}

	res, err := h.service.Create(c.Request.Context(), &req)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, res)
}

func (h *PumpingStationHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req models.PumpingStation
	if err := c.ShouldBindJSON(&req); err != nil {
		h.SendError(c, web.BadRequest(err.Error()))
		return
	}

	err := h.service.Update(c.Request.Context(), id, &req)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}

func (h *PumpingStationHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	err := h.service.Delete(c.Request.Context(), id)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}

func (h *PumpingStationHandler) List(c *gin.Context) {
	f := filter.NewBasicFilter()
	page, _ := strconv.Atoi(c.DefaultQuery("page", "0"))
	sizeStr := c.DefaultQuery("size", "")
	if sizeStr == "" {
		sizeStr = c.DefaultQuery("per_page", "10")
	}
	size, _ := strconv.Atoi(sizeStr)
	f.SetOrderBy("-created_at")

	res, total, err := h.service.List(c.Request.Context(), f)
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, gin.H{
		"data":  res,
		"total": total,
		"page":  page,
		"size":  size,
	})
}

// History
func (h *PumpingStationHandler) CreateHistory(c *gin.Context) {
	token := h.contextWith.GetToken(c.Request)
	user, err := h.authService.GetProfile(c.Request.Context(), token)
	if err != nil {
		h.SendError(c, web.Unauthorized("vui lòng đăng nhập lại"))
		return
	}

	var req models.PumpingStationHistory
	if err := c.ShouldBindJSON(&req); err != nil {
		h.SendError(c, web.BadRequest(err.Error()))
		return
	}

	res, err := h.service.CreateHistory(c.Request.Context(), user, &req)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, res)
}

func (h *PumpingStationHandler) ListHistory(c *gin.Context) {
	id := c.Param("id")
	f := filter.NewBasicFilter()
	f.AddWhere("station_id", "station_id", id)
	f.SetOrderBy("-timestamp")

	res, total, err := h.service.ListHistory(c.Request.Context(), f)
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, gin.H{
		"data":  res,
		"total": total,
	})
}
