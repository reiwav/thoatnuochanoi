package handler

import (
	"ai-api-tnhn/constant"
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/auth"
	pumpingstation "ai-api-tnhn/internal/service/pumping_station"
	"ai-api-tnhn/utils/web"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
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

func (h *PumpingStationHandler) checkPermissions(c *gin.Context) (isSuperAdmin bool, isAllowedAll bool, user *models.User) {
	token := h.contextWith.GetToken(c.Request)
	user, err := h.authService.GetProfile(c.Request.Context(), token)
	if err != nil || user == nil {
		return false, false, nil
	}

	// Logic động: Super Admin hoặc Role có flag IsCompany=true trong DB mới được xem tất cả
	isSuperAdmin = user.Role == "super_admin"
	isAllowedAll = isSuperAdmin || user.IsCompany

	return isSuperAdmin, isAllowedAll, user
}

func (h *PumpingStationHandler) Create(c *gin.Context) {
	var req models.PumpingStation
	if err := c.ShouldBindJSON(&req); err != nil {
		h.SendError(c, web.BadRequest(err.Error()))
		return
	}

	if req.ShareAll {
		req.SharedOrgIDs = []string{}
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

	_, isAllowedAll, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Invalid user session"))
		return
	}

	// Ownership check
	current, err := h.service.GetByID(c.Request.Context(), id)
	if err != nil || current == nil {
		h.SendError(c, web.BadRequest("Không tìm thấy trạm bơm"))
		return
	}

	if !isAllowedAll && current.OrgID != user.OrgID {
		h.SendError(c, web.Unauthorized("Bạn không có quyền chỉnh sửa trạm của đơn vị khác"))
		return
	}

	if req.ShareAll {
		req.SharedOrgIDs = []string{}
	}

	err = h.service.Update(c.Request.Context(), id, &req)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}

func (h *PumpingStationHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	_, isAllowedAll, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Invalid user session"))
		return
	}

	current, err := h.service.GetByID(c.Request.Context(), id)
	if err != nil || current == nil {
		h.SendError(c, web.BadRequest("Không tìm thấy trạm bơm"))
		return
	}

	if !isAllowedAll && current.OrgID != user.OrgID {
		h.SendError(c, web.Unauthorized("Bạn không có quyền xóa trạm của đơn vị khác"))
		return
	}

	err = h.service.Delete(c.Request.Context(), id)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}

func (h *PumpingStationHandler) Get(c *gin.Context) {
	id := c.Param("id")
	res, err := h.service.GetByID(c.Request.Context(), id)
	if err != nil {
		h.SendError(c, err)
		return
	}
	if res == nil {
		h.SendError(c, web.NotFound("trạm bơm không tồn tại"))
		return
	}
	h.SendData(c, res)
}

func (h *PumpingStationHandler) List(c *gin.Context) {
	f := filter.NewBasicFilter()
	page, _ := strconv.Atoi(c.DefaultQuery("page", "0"))
	sizeStr := c.DefaultQuery("size", "")
	if sizeStr == "" {
		sizeStr = c.DefaultQuery("per_page", "10")
	}
	size, _ := strconv.Atoi(sizeStr)
	f.SetOrderBy("name")

	// Permission-based filtering
	_, isAllowedAll, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("vui lòng đăng nhập lại"))
		return
	}

	targetOrgID := ""
	if isAllowedAll {
		targetOrgID = c.Query("org_id")
	} else {
		targetOrgID = user.OrgID
	}

	if targetOrgID != "" {
		// UNION logic: Owned by Org OR in SharedOrgIDs list
		f.AddWhere("org_id_or_shared", "$or", []bson.M{
			{"org_id": targetOrgID},
			{"shared_org_ids": targetOrgID},
			{"share_all": true},
		})
	} else if user.Role == constant.ROLE_EMPLOYEE || user.IsEmployee {
		// Employee view: Only their assigned station
		if user.AssignedPumpingStationID != "" {
			f.AddWhere("id", "_id", user.AssignedPumpingStationID)
		} else {
			h.SendData(c, gin.H{"data": []interface{}{}, "total": 0})
			return
		}
	}

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
