package handler

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/station/sluice_gate"
	"ai-api-tnhn/utils/web"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
)

type SluiceGateHandler struct {
	web.JsonRender
	service     sluice_gate.Service
	contextWith web.ContextWith
}

func NewSluiceGateHandler(service sluice_gate.Service, contextWith web.ContextWith) *SluiceGateHandler {
	return &SluiceGateHandler{
		service:     service,
		contextWith: contextWith,
	}
}

func (h *SluiceGateHandler) checkPermissions(c *gin.Context) (isSuperAdmin bool, isAllowedAll bool, user *models.User) {
	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
		return false, false, nil
	}

	isSuperAdmin = user.Role == "super_admin"
	isAllowedAll = isSuperAdmin || user.IsCompany

	return isSuperAdmin, isAllowedAll, user
}

// Create godoc
// @Summary Tạo mới cửa phai
// @Tags Cửa phai
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param station body models.SluiceGate true "Dữ liệu cửa phai"
// @Success 200 {object} web.Response{data=models.SluiceGate}
// @Router /admin/stations/sluice-gate [post]
func (h *SluiceGateHandler) Create(c *gin.Context) {
	var req models.SluiceGate
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

// Update godoc
// @Summary Cập nhật cửa phai
// @Tags Cửa phai
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID cửa phai"
// @Param station body models.SluiceGate true "Dữ liệu cập nhật"
// @Success 200 {boolean} bool
// @Router /admin/stations/sluice-gate/{id} [put]
func (h *SluiceGateHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req models.SluiceGate
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

// Delete godoc
// @Summary Xóa cửa phai
// @Tags Cửa phai
// @Security BearerAuth
// @Param id path string true "ID cửa phai"
// @Success 200 {boolean} bool
// @Router /admin/stations/sluice-gate/{id} [delete]
func (h *SluiceGateHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	err := h.service.Delete(c.Request.Context(), id)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}

// Get godoc
// @Summary Lấy chi tiết cửa phai
// @Tags Cửa phai
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID cửa phai"
// @Success 200 {object} web.Response{data=models.SluiceGate}
// @Router /admin/stations/sluice-gate/{id} [get]
func (h *SluiceGateHandler) Get(c *gin.Context) {
	id := c.Param("id")
	res, err := h.service.Get(c.Request.Context(), id)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, res)
}

// List godoc
// @Summary Danh sách cửa phai
// @Tags Cửa phai
// @Produce json
// @Security BearerAuth
// @Param org_id query string false "Lọc theo đơn vị"
// @Success 200 {object} web.Response{data=object{data=[]models.SluiceGate,total=int}}
// @Router /admin/stations/sluice-gate [get]
func (h *SluiceGateHandler) List(c *gin.Context) {
	f := filter.NewBasicFilter()
	f.SetOrderBy("priority")

	_, isAllowedAll, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("vui lòng đăng nhập lại"))
		return
	}

	if isAllowedAll {
		qOrgID := c.Query("org_id")
		if qOrgID != "" {
			f.AddWhere("org_id", "org_id", qOrgID)
		}
	} else if user.AssignedSluiceGateID != "" {
		gate, err := h.service.Get(c.Request.Context(), user.AssignedSluiceGateID)
		if err != nil || gate == nil {
			h.SendData(c, gin.H{"data": []interface{}{}, "total": 0})
			return
		}
		h.SendData(c, gin.H{"data": []*models.SluiceGate{gate}, "total": 1})
		return
	} else {
		f.AddWhere("visibility", "$or", []bson.M{
			{"org_id": user.OrgID},
			{"shared_org_ids": user.OrgID},
			{"share_all": true},
		})
	}

	res, total, err := h.service.List(c.Request.Context(), f)
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, gin.H{
		"data":  res,
		"total": total,
	})
}

// Report godoc
// @Summary Nhân viên gửi báo cáo vận hành cửa phai
// @Tags Cửa phai
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID cửa phai"
// @Param report body models.SluiceGateHistory true "Nội dung báo cáo"
// @Success 200 {boolean} bool
// @Router /admin/stations/sluice-gate/{id}/report [post]
func (h *SluiceGateHandler) Report(c *gin.Context) {
	id := c.Param("id")
	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
		h.SendError(c, web.Unauthorized("vui lòng đăng nhập lại"))
		return
	}

	var req models.SluiceGateHistory
	if err := c.ShouldBindJSON(&req); err != nil {
		h.SendError(c, web.BadRequest(err.Error()))
		return
	}
	
	req.UserID = user.ID
	req.Username = user.Username
	req.Fullname = user.Name

	err = h.service.Report(c.Request.Context(), id, &req)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}

// ListHistory godoc
// @Summary Xem lịch sử vận hành cửa phai
// @Tags Cửa phai
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID cửa phai"
// @Success 200 {object} web.Response{data=object{data=[]models.SluiceGateHistory,total=int}}
// @Router /admin/stations/sluice-gate/{id}/history [get]
func (h *SluiceGateHandler) ListHistory(c *gin.Context) {
	id := c.Param("id")
	f := filter.NewBasicFilter()
	f.SetOrderBy("-created_at")

	res, total, err := h.service.ListHistory(c.Request.Context(), id, f)
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, gin.H{
		"data":  res,
		"total": total,
	})
}
