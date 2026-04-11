package handler

import (
	"ai-api-tnhn/handler/filters"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/auth"
	"ai-api-tnhn/internal/service/station"
	"ai-api-tnhn/utils/web"

	"go.mongodb.org/mongo-driver/bson"

	"github.com/gin-gonic/gin"
)

type StationHandler struct {
	web.JsonRender
	service     station.Service
	authService auth.Service
	contextWith web.ContextWith
}

func NewStationHandler(service station.Service, authService auth.Service, contextWith web.ContextWith) *StationHandler {
	return &StationHandler{
		service:     service,
		authService: authService,
		contextWith: contextWith,
	}
}

func (h *StationHandler) checkPermissions(c *gin.Context) (isSuperAdmin bool, isAllowedAll bool, user *models.User) {
	token := h.contextWith.GetToken(c.Request)
	user, err := h.authService.GetProfile(c.Request.Context(), token)
	if err != nil || user == nil {
		return false, false, nil
	}

	// We no longer distinguish Super Admin strings, only IsCompany flag
	isAllowedAll = user.IsCompany
	return false, isAllowedAll, user
}

// RAIN STATIONS
func (h *StationHandler) CreateRain(c *gin.Context) {
	var m models.RainStation
	if err := c.ShouldBindJSON(&m); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	_, isAllowedAll, user := h.checkPermissions(c)
	if user != nil {
		if isAllowedAll {
			// Super Admin or Company level: must provide OrgID
			if m.OrgID == "" {
				web.AssertNil(web.BadRequest("Vui lòng chọn xí nghiệp quản lý"))
				return
			}
		} else {
			// Branch level: auto-assign their own OrgID
			m.OrgID = user.OrgID
		}
	}

	if m.OrgID == "" {
		web.AssertNil(web.BadRequest("Không xác định được xí nghiệp quản lý"))
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

	_, isAllowedAll, user := h.checkPermissions(c)
	if user != nil {
		if !isAllowedAll {
			// Non-admin can't change OrgID, force their own
			// Or better: verify it belongs to them first.
			// For now, force it to their OrgID if they try to update
			m.OrgID = user.OrgID
		}
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

	// Permission-based filtering
	_, isAllowedAll, user := h.checkPermissions(c)
	if user != nil && !isAllowedAll {
		// UNION logic: Owned by Org OR in SharedOrgIDs list
		req.AddWhere("org_id_or_shared", "$or", []bson.M{
			{"org_id": user.OrgID},
			{"shared_org_ids": user.OrgID},
		})
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

	_, isAllowedAll, user := h.checkPermissions(c)
	if user != nil {
		if isAllowedAll {
			if m.OrgID == "" {
				web.AssertNil(web.BadRequest("Vui lòng chọn xí nghiệp quản lý"))
				return
			}
		} else {
			m.OrgID = user.OrgID
		}
	}

	if m.OrgID == "" {
		web.AssertNil(web.BadRequest("Không xác định được xí nghiệp quản lý"))
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

	_, isAllowedAll, user := h.checkPermissions(c)
	if user != nil && !isAllowedAll {
		m.OrgID = user.OrgID
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

	// Permission-based filtering
	_, isAllowedAll, user := h.checkPermissions(c)
	if user != nil && !isAllowedAll {
		// UNION logic: Owned by Org OR in SharedOrgIDs list
		req.AddWhere("org_id_or_shared", "$or", []bson.M{
			{"org_id": user.OrgID},
			{"shared_org_ids": user.OrgID},
		})
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

	_, isAllowedAll, user := h.checkPermissions(c)
	if user != nil {
		if isAllowedAll {
			if m.OrgID == "" {
				web.AssertNil(web.BadRequest("Vui lòng chọn xí nghiệp quản lý"))
				return
			}
		} else {
			m.OrgID = user.OrgID
		}
	}

	if m.OrgID == "" {
		web.AssertNil(web.BadRequest("Không xác định được xí nghiệp quản lý"))
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

	_, isAllowedAll, user := h.checkPermissions(c)
	if user != nil && !isAllowedAll {
		m.OrgID = user.OrgID
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

	// Permission-based filtering
	_, isAllowedAll, user := h.checkPermissions(c)
	if user != nil && !isAllowedAll {
		// UNION logic: Owned by Org OR in SharedOrgIDs list
		req.AddWhere("org_id_or_shared", "$or", []bson.M{
			{"org_id": user.OrgID},
			{"shared_org_ids": user.OrgID},
		})
	}

	items, total, err := h.service.ListRiverStations(c.Request.Context(), req)
	web.AssertNil(err)
	h.SendData(c, gin.H{"data": items, "total": total})
}
