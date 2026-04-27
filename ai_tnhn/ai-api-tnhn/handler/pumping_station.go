package handler

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	pumpingstation "ai-api-tnhn/internal/service/station/pumping_station"
	"ai-api-tnhn/utils/web"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
)

type PumpingStationHandler struct {
	web.JsonRender
	service     pumpingstation.Service
	contextWith web.ContextWith
}

func NewPumpingStationHandler(service pumpingstation.Service, contextWith web.ContextWith) *PumpingStationHandler {
	return &PumpingStationHandler{
		service:     service,
		contextWith: contextWith,
	}
}

func (h *PumpingStationHandler) checkPermissions(c *gin.Context) (isSuperAdmin bool, isAllowedAll bool, user *models.User) {
	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
		return false, false, nil
	}

	// Logic động: Super Admin hoặc Role có flag IsCompany=true trong DB mới được xem tất cả
	isSuperAdmin = user.Role == "super_admin"
	isAllowedAll = isSuperAdmin || user.IsCompany

	return isSuperAdmin, isAllowedAll, user
}

// Create godoc
// @Summary Tạo mới trạm bơm
// @Description Tạo mới một trạm quan trắc cho hệ thống bơm cưỡng bức
// @Tags Trạm bơm
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param station body models.PumpingStation true "Dữ liệu trạm bơm"
// @Success 200 {object} web.Response{data=models.PumpingStation}
// @Failure 401 {object} web.ErrorResponse
// @Router /admin/stations/pumping [post]
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

// Update godoc
// @Summary Cập nhật trạm bơm
// @Description Cập nhật thông tin chi tiết của một trạm bơm hiện có
// @Tags Trạm bơm
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID trạm bơm"
// @Param station body models.PumpingStation true "Dữ liệu trạm bơm cập nhật"
// @Success 200 {boolean} bool
// @Failure 401 {object} web.ErrorResponse
// @Router /admin/stations/pumping/{id} [put]
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

// Delete godoc
// @Summary Xóa trạm bơm
// @Description Loại bỏ một trạm bơm khỏi hệ thống theo ID
// @Tags Trạm bơm
// @Security BearerAuth
// @Param id path string true "ID trạm bơm"
// @Success 200 {boolean} bool
// @Failure 401 {object} web.ErrorResponse
// @Router /admin/stations/pumping/{id} [delete]
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

// Get godoc
// @Summary Lấy thông tin trạm bơm theo ID
// @Description Truy xuất thông tin chi tiết của một trạm bơm cụ thể
// @Tags Trạm bơm
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID trạm bơm"
// @Success 200 {object} web.Response{data=models.PumpingStation}
// @Failure 404 {object} web.ErrorResponse
// @Router /admin/stations/pumping/{id} [get]
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

// List godoc
// @Summary Danh sách trạm bơm
// @Description Truy xuất danh sách các trạm bơm với bộ lọc
// @Tags Trạm bơm
// @Produce json
// @Security BearerAuth
// @Param org_id query string false "Lọc theo ID đơn vị"
// @Param page query int false "Số trang"
// @Param size query int false "Số bản ghi mỗi trang"
// @Success 200 {object} web.Response{data=object{data=[]models.PumpingStation,total=int}}
// @Router /admin/stations/pumping [get]
func (h *PumpingStationHandler) List(c *gin.Context) {
	f := filter.NewBasicFilter()
	page, _ := strconv.Atoi(c.DefaultQuery("page", "0"))
	sizeStr := c.DefaultQuery("size", "")
	if sizeStr == "" {
		sizeStr = c.DefaultQuery("per_page", "10")
	}
	size, _ := strconv.Atoi(sizeStr)
	f.SetOrderBy("priority")

	// 1. Permission/Visibility Check
	_, isAllowedAll, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("vui lòng đăng nhập lại"))
		return
	}

	// 2. Base Visibility & Search Filter
	if isAllowedAll {
		// Privileged users: unfiltered by default, strict when org_id is provided
		qOrgID := c.Query("org_id")
		if qOrgID != "" {
			f.AddWhere("org_id", "org_id", qOrgID)
		}
	} else if user.IsEmployee {
		// Employee: ONLY their assigned station
		if user.AssignedPumpingStationID != "" {
			f.AddWhere("id", "_id", user.AssignedPumpingStationID)
		} else {
			h.SendData(c, gin.H{"data": []interface{}{}, "total": 0})
			return
		}
	} else {
		// Unit Admin: Access-based view (owned, shared specifically, or shared globally)
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
		"page":  page,
		"size":  size,
	})
}

// History
// CreateHistory godoc
// @Summary Báo cáo trạng thái vận hành trạm bơm
// @Description Ghi nhận trạng thái hoặc lịch sử vận hành cho một trạm bơm
// @Tags Trạm bơm
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param history body models.PumpingStationHistory true "Dữ liệu vận hành"
// @Success 200 {object} web.Response{data=models.PumpingStationHistory}
// @Failure 401 {object} web.ErrorResponse
// @Router /admin/stations/pumping/report [post]
func (h *PumpingStationHandler) CreateHistory(c *gin.Context) {
	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
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

// ListHistory godoc
// @Summary Lấy lịch sử vận hành trạm bơm
// @Description Truy xuất danh sách các báo cáo lịch sử vận hành cho một trạm cụ thể
// @Tags Trạm bơm
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID trạm bơm"
// @Success 200 {object} web.Response{data=object{data=[]models.PumpingStationHistory,total=int}}
// @Router /admin/stations/pumping/{id}/history [get]
func (h *PumpingStationHandler) ListHistory(c *gin.Context) {
	id := c.Param("id")
	f := filter.NewBasicFilter()
	f.AddWhere("station_id", "station_id", id)

	fromTimeStr := c.Query("from_time")
	if fromTimeStr != "" {
		if fromTime, err := strconv.ParseInt(fromTimeStr, 10, 64); err == nil && fromTime > 0 {
			f.AddWhere("from_time", "timestamp", bson.M{"$gte": fromTime})
		}
	}
	toTimeStr := c.Query("to_time")
	if toTimeStr != "" {
		if toTime, err := strconv.ParseInt(toTimeStr, 10, 64); err == nil && toTime > 0 {
			f.AddWhere("to_time", "timestamp", bson.M{"$lte": toTime})
		}
	}

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
