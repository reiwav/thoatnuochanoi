package handler

import (
	"ai-api-tnhn/constant"
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/station/wastewater_treatment"
	"ai-api-tnhn/utils/web"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
)

type WastewaterTreatmentHandler struct {
	web.JsonRender
	service     wastewater_treatment.Service
	contextWith web.ContextWith
}

func NewWastewaterTreatmentHandler(service wastewater_treatment.Service, contextWith web.ContextWith) *WastewaterTreatmentHandler {
	return &WastewaterTreatmentHandler{
		service:     service,
		contextWith: contextWith,
	}
}

func (h *WastewaterTreatmentHandler) checkPermissions(c *gin.Context) (isSuperAdmin bool, isAllowedAll bool, user *models.User) {
	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
		return false, false, nil
	}

	isSuperAdmin = user.Role == "super_admin"
	isAllowedAll = isSuperAdmin || user.IsCompany

	return isSuperAdmin, isAllowedAll, user
}

// Create godoc
// @Summary Tạo mới trạm xử lý nước thải
// @Tags Trạm xử lý nước thải
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param station body models.WastewaterStation true "Dữ liệu trạm"
// @Success 200 {object} web.Response{data=models.WastewaterStation}
// @Router /admin/stations/wastewater [post]
func (h *WastewaterTreatmentHandler) Create(c *gin.Context) {
	var req models.WastewaterStation
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
// @Summary Cập nhật trạm xử lý nước thải
// @Tags Trạm xử lý nước thải
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID trạm"
// @Param station body models.WastewaterStation true "Dữ liệu cập nhật"
// @Success 200 {boolean} bool
// @Router /admin/stations/wastewater/{id} [put]
func (h *WastewaterTreatmentHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req models.WastewaterStation
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
// @Summary Xóa trạm xử lý nước thải
// @Tags Trạm xử lý nước thải
// @Security BearerAuth
// @Param id path string true "ID trạm"
// @Success 200 {boolean} bool
// @Router /admin/stations/wastewater/{id} [delete]
func (h *WastewaterTreatmentHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	err := h.service.Delete(c.Request.Context(), id)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}

// Get godoc
// @Summary Lấy chi tiết trạm xử lý nước thải
// @Tags Trạm xử lý nước thải
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID trạm"
// @Success 200 {object} web.Response{data=models.WastewaterStation}
// @Router /admin/stations/wastewater/{id} [get]
func (h *WastewaterTreatmentHandler) Get(c *gin.Context) {
	id := c.Param("id")
	res, err := h.service.GetByID(c.Request.Context(), id)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, res)
}

// List godoc
// @Summary Danh sách trạm xử lý nước thải
// @Tags Trạm xử lý nước thải
// @Produce json
// @Security BearerAuth
// @Param org_id query string false "Lọc theo đơn vị"
// @Success 200 {object} web.Response{data=object{data=[]models.WastewaterStation,total=int}}
// @Router /admin/stations/wastewater [get]
func (h *WastewaterTreatmentHandler) List(c *gin.Context) {
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
	} else if user.Role == constant.ROLE_EMPLOYEE || user.IsEmployee {
		// Needs to handle assigned wastewater station if added to User model, 
		// but for now we follow pumping station logic
		h.SendData(c, gin.H{"data": []interface{}{}, "total": 0})
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

// SubmitReport godoc
// @Summary Nhân viên cập nhật nhận xét trạm xử lý nước thải
// @Tags Trạm xử lý nước thải
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID trạm"
// @Param report body wastewater_treatment.SubmitReportRequest true "Nội dung nhận xét"
// @Success 200 {boolean} bool
// @Router /admin/stations/wastewater/{id}/report [post]
func (h *WastewaterTreatmentHandler) SubmitReport(c *gin.Context) {
	id := c.Param("id")
	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
		h.SendError(c, web.Unauthorized("vui lòng đăng nhập lại"))
		return
	}

	var req wastewater_treatment.SubmitReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.SendError(c, web.BadRequest(err.Error()))
		return
	}

	err = h.service.SubmitReport(c.Request.Context(), id, user.ID, user.Name, req.Note)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}

// ListHistory godoc
// @Summary Xem lịch sử nhận xét trạm xử lý nước thải
// @Tags Trạm xử lý nước thải
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID trạm"
// @Success 200 {object} web.Response{data=object{data=[]models.WastewaterStationReport,total=int}}
// @Router /admin/stations/wastewater/{id}/history [get]
func (h *WastewaterTreatmentHandler) ListHistory(c *gin.Context) {
	id := c.Param("id")
	f := filter.NewBasicFilter()
	f.SetOrderBy("-timestamp")

	res, total, err := h.service.GetHistory(c.Request.Context(), id, f)
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, gin.H{
		"data":  res,
		"total": total,
	})
}
