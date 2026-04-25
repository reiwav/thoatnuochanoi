package handler

import (
	"ai-api-tnhn/handler/filters"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/station"
	"ai-api-tnhn/utils/web"

	"go.mongodb.org/mongo-driver/bson"

	"github.com/gin-gonic/gin"
)

type StationHandler struct {
	web.JsonRender
	service     station.Service
	contextWith web.ContextWith
}

func NewStationHandler(service station.Service, contextWith web.ContextWith) *StationHandler {
	return &StationHandler{
		service:     service,
		contextWith: contextWith,
	}
}

func (h *StationHandler) checkPermissions(c *gin.Context) (isSuperAdmin bool, isAllowedAll bool, user *models.User) {
	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
		return false, false, nil
	}

	// Logic động: Super Admin hoặc Role có flag IsCompany=true trong DB mới được xem tất cả
	isSuperAdmin = user.Role == "super_admin"
	isAllowedAll = isSuperAdmin || user.IsCompany

	return isSuperAdmin, isAllowedAll, user
}

// RAIN STATIONS
// CreateRain godoc
// @Summary Tạo mới trạm đo mưa
// @Description Tạo mới một trạm quan trắc lượng mưa
// @Tags Trạm quan trắc - Mưa
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param station body models.RainStation true "Dữ liệu trạm"
// @Success 200 {object} web.Response{data=models.RainStation}
// @Failure 400 {object} web.ErrorResponse
// @Router /admin/stations/rain [post]
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

	if m.ShareAll {
		m.SharedOrgIDs = []string{}
	}

	res, err := h.service.CreateRainStation(c.Request.Context(), &m)
	web.AssertNil(err)
	h.SendData(c, res)
}

// UpdateRain godoc
// @Summary Cập nhật trạm đo mưa
// @Description Cập nhật thông tin chi tiết của một trạm đo mưa hiện có
// @Tags Trạm quan trắc - Mưa
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID trạm"
// @Param station body models.RainStation true "Dữ liệu trạm cập nhật"
// @Success 200 {object} web.Response{data=models.RainStation}
// @Failure 401 {object} web.ErrorResponse
// @Router /admin/stations/rain/{id} [put]
func (h *StationHandler) UpdateRain(c *gin.Context) {
	id := c.Param("id")
	var m models.RainStation
	if err := c.ShouldBindJSON(&m); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	_, isAllowedAll, user := h.checkPermissions(c)
	if user == nil {
		web.AssertNil(web.Unauthorized("Invalid user session"))
		return
	}

	// Ownership check
	current, err := h.service.GetRainStation(c.Request.Context(), id)
	if err != nil || current == nil {
		web.AssertNil(web.BadRequest("Không tìm thấy trạm đo mưa"))
		return
	}

	if !isAllowedAll && current.OrgID != user.OrgID {
		web.AssertNil(web.Unauthorized("Bạn không có quyền chỉnh sửa trạm của đơn vị khác"))
		return
	}

	if !isAllowedAll {
		m.OrgID = current.OrgID
	}

	if m.ShareAll {
		m.SharedOrgIDs = []string{}
	}

	err = h.service.UpdateRainStation(c.Request.Context(), id, &m)
	web.AssertNil(err)
	h.SendData(c, m)
}

// DeleteRain godoc
// @Summary Xóa trạm đo mưa
// @Description Loại bỏ một trạm đo mưa theo ID
// @Tags Trạm quan trắc - Mưa
// @Security BearerAuth
// @Param id path string true "ID trạm"
// @Success 200 {boolean} bool
// @Failure 401 {object} web.ErrorResponse
// @Router /admin/stations/rain/{id} [delete]
func (h *StationHandler) DeleteRain(c *gin.Context) {
	id := c.Param("id")
	_, isAllowedAll, user := h.checkPermissions(c)
	if user == nil {
		web.AssertNil(web.Unauthorized("Invalid user session"))
		return
	}

	current, err := h.service.GetRainStation(c.Request.Context(), id)
	if err == nil && current != nil && !isAllowedAll && current.OrgID != user.OrgID {
		web.AssertNil(web.Unauthorized("Bạn không có quyền xóa trạm của đơn vị khác"))
		return
	}

	err = h.service.DeleteRainStation(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, nil)
}

// GetRainByID godoc
// @Summary Lấy thông tin trạm đo mưa theo ID
// @Description Truy xuất thông tin chi tiết của một trạm đo mưa cụ thể
// @Tags Trạm quan trắc - Mưa
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID trạm"
// @Success 200 {object} web.Response{data=models.RainStation}
// @Router /admin/stations/rain/{id} [get]
func (h *StationHandler) GetRainByID(c *gin.Context) {
	id := c.Param("id")
	res, err := h.service.GetRainStation(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, res)
}

// ListRain godoc
// @Summary Danh sách trạm đo mưa
// @Description Truy xuất danh sách các trạm đo mưa với bộ lọc
// @Tags Trạm quan trắc - Mưa
// @Produce json
// @Security BearerAuth
// @Param search query string false "Tìm kiếm theo tên trạm"
// @Param active query string false "Lọc theo trạng thái hoạt động (true/false)"
// @Param org_id query string false "Lọc theo ID đơn vị"
// @Param page query int false "Số trang"
// @Param size query int false "Số bản ghi mỗi trang"
// @Success 200 {object} web.Response{data=object{data=[]models.RainStation,total=int}}
// @Router /admin/stations/rain [get]
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
			{"share_all": true},
		})
	}

	items, total, err := h.service.ListRainStations(c.Request.Context(), req)
	web.AssertNil(err)
	h.SendData(c, gin.H{"data": items, "total": total})
}

// LAKE STATIONS
// CreateLake godoc
// @Summary Tạo mới trạm hồ
// @Description Tạo mới một trạm quan trắc cho hồ
// @Tags Trạm quan trắc - Hồ
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param station body models.LakeStation true "Dữ liệu trạm"
// @Success 200 {object} web.Response{data=models.LakeStation}
// @Failure 400 {object} web.ErrorResponse
// @Router /admin/stations/lake [post]
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

	if m.ShareAll {
		m.SharedOrgIDs = []string{}
	}

	res, err := h.service.CreateLakeStation(c.Request.Context(), &m)
	web.AssertNil(err)
	h.SendData(c, res)
}

// UpdateLake godoc
// @Summary Cập nhật trạm hồ
// @Description Cập nhật thông tin chi tiết của một trạm hồ hiện có
// @Tags Trạm quan trắc - Hồ
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID trạm"
// @Param station body models.LakeStation true "Dữ liệu trạm cập nhật"
// @Success 200 {object} web.Response{data=models.LakeStation}
// @Failure 401 {object} web.ErrorResponse
// @Router /admin/stations/lake/{id} [put]
func (h *StationHandler) UpdateLake(c *gin.Context) {
	id := c.Param("id")
	var m models.LakeStation
	if err := c.ShouldBindJSON(&m); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	_, isAllowedAll, user := h.checkPermissions(c)
	if user == nil {
		web.AssertNil(web.Unauthorized("Invalid user session"))
		return
	}

	// Ownership check
	current, err := h.service.GetLakeStation(c.Request.Context(), id)
	if err != nil || current == nil {
		web.AssertNil(web.BadRequest("Không tìm thấy trạm hồ"))
		return
	}

	if !isAllowedAll && current.OrgID != user.OrgID {
		web.AssertNil(web.Unauthorized("Bạn không có quyền chỉnh sửa trạm của đơn vị khác"))
		return
	}

	if !isAllowedAll {
		m.OrgID = current.OrgID
	}

	if m.ShareAll {
		m.SharedOrgIDs = []string{}
	}

	err = h.service.UpdateLakeStation(c.Request.Context(), id, &m)
	web.AssertNil(err)
	h.SendData(c, m)
}

// DeleteLake godoc
// @Summary Xóa trạm hồ
// @Description Loại bỏ một trạm hồ theo ID
// @Tags Trạm quan trắc - Hồ
// @Security BearerAuth
// @Param id path string true "ID trạm"
// @Success 200 {boolean} bool
// @Failure 401 {object} web.ErrorResponse
// @Router /admin/stations/lake/{id} [delete]
func (h *StationHandler) DeleteLake(c *gin.Context) {
	id := c.Param("id")
	_, isAllowedAll, user := h.checkPermissions(c)
	if user == nil {
		web.AssertNil(web.Unauthorized("Invalid user session"))
		return
	}

	current, err := h.service.GetLakeStation(c.Request.Context(), id)
	if err == nil && current != nil && !isAllowedAll && current.OrgID != user.OrgID {
		web.AssertNil(web.Unauthorized("Bạn không có quyền xóa trạm của đơn vị khác"))
		return
	}

	err = h.service.DeleteLakeStation(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, nil)
}

// GetLakeByID godoc
// @Summary Lấy thông tin trạm hồ theo ID
// @Description Truy xuất thông tin chi tiết của một trạm hồ cụ thể
// @Tags Trạm quan trắc - Hồ
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID trạm"
// @Success 200 {object} web.Response{data=models.LakeStation}
// @Router /admin/stations/lake/{id} [get]
func (h *StationHandler) GetLakeByID(c *gin.Context) {
	id := c.Param("id")
	res, err := h.service.GetLakeStation(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, res)
}

// ListLake godoc
// @Summary Danh sách trạm hồ
// @Description Truy xuất danh sách các trạm hồ với bộ lọc
// @Tags Trạm quan trắc - Hồ
// @Produce json
// @Security BearerAuth
// @Param search query string false "Tìm kiếm theo tên trạm"
// @Param active query string false "Lọc theo trạng thái hoạt động (true/false)"
// @Param org_id query string false "Lọc theo ID đơn vị"
// @Param page query int false "Số trang"
// @Param size query int false "Số bản ghi mỗi trang"
// @Success 200 {object} web.Response{data=object{data=[]models.LakeStation,total=int}}
// @Router /admin/stations/lake [get]
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
			{"share_all": true},
		})
	}

	items, total, err := h.service.ListLakeStations(c.Request.Context(), req)
	web.AssertNil(err)
	h.SendData(c, gin.H{"data": items, "total": total})
}

// RIVER STATIONS
// CreateRiver godoc
// @Summary Tạo mới trạm sông
// @Description Tạo mới một trạm quan trắc cho sông
// @Tags Trạm quan trắc - Sông
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param station body models.RiverStation true "Dữ liệu trạm"
// @Success 200 {object} web.Response{data=models.RiverStation}
// @Failure 400 {object} web.ErrorResponse
// @Router /admin/stations/river [post]
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

	if m.ShareAll {
		m.SharedOrgIDs = []string{}
	}

	res, err := h.service.CreateRiverStation(c.Request.Context(), &m)
	web.AssertNil(err)
	h.SendData(c, res)
}

// UpdateRiver godoc
// @Summary Cập nhật trạm sông
// @Description Cập nhật thông tin chi tiết của một trạm sông hiện có
// @Tags Trạm quan trắc - Sông
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID trạm"
// @Param station body models.RiverStation true "Dữ liệu trạm cập nhật"
// @Success 200 {object} web.Response{data=models.RiverStation}
// @Failure 401 {object} web.ErrorResponse
// @Router /admin/stations/river/{id} [put]
func (h *StationHandler) UpdateRiver(c *gin.Context) {
	id := c.Param("id")
	var m models.RiverStation
	if err := c.ShouldBindJSON(&m); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	_, isAllowedAll, user := h.checkPermissions(c)
	if user == nil {
		web.AssertNil(web.Unauthorized("Invalid user session"))
		return
	}

	// Ownership check
	current, err := h.service.GetRiverStation(c.Request.Context(), id)
	if err != nil || current == nil {
		web.AssertNil(web.BadRequest("Không tìm thấy trạm sông"))
		return
	}

	if !isAllowedAll && current.OrgID != user.OrgID {
		web.AssertNil(web.Unauthorized("Bạn không có quyền chỉnh sửa trạm của đơn vị khác"))
		return
	}

	if !isAllowedAll {
		m.OrgID = current.OrgID
	}

	if m.ShareAll {
		m.SharedOrgIDs = []string{}
	}

	err = h.service.UpdateRiverStation(c.Request.Context(), id, &m)
	web.AssertNil(err)
	h.SendData(c, m)
}

// DeleteRiver godoc
// @Summary Xóa trạm sông
// @Description Loại bỏ một trạm sông theo ID
// @Tags Trạm quan trắc - Sông
// @Security BearerAuth
// @Param id path string true "ID trạm"
// @Success 200 {boolean} bool
// @Failure 401 {object} web.ErrorResponse
// @Router /admin/stations/river/{id} [delete]
func (h *StationHandler) DeleteRiver(c *gin.Context) {
	id := c.Param("id")
	_, isAllowedAll, user := h.checkPermissions(c)
	if user == nil {
		web.AssertNil(web.Unauthorized("Invalid user session"))
		return
	}

	current, err := h.service.GetRiverStation(c.Request.Context(), id)
	if err == nil && current != nil && !isAllowedAll && current.OrgID != user.OrgID {
		web.AssertNil(web.Unauthorized("Bạn không có quyền xóa trạm của đơn vị khác"))
		return
	}

	err = h.service.DeleteRiverStation(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, nil)
}

// GetRiverByID godoc
// @Summary Lấy thông tin trạm sông theo ID
// @Description Truy xuất thông tin chi tiết của một trạm sông cụ thể
// @Tags Trạm quan trắc - Sông
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID trạm"
// @Success 200 {object} web.Response{data=models.RiverStation}
// @Router /admin/stations/river/{id} [get]
func (h *StationHandler) GetRiverByID(c *gin.Context) {
	id := c.Param("id")
	res, err := h.service.GetRiverStation(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, res)
}

// ListRiver godoc
// @Summary Danh sách trạm sông
// @Description Truy xuất danh sách các trạm sông với bộ lọc
// @Tags Trạm quan trắc - Sông
// @Produce json
// @Security BearerAuth
// @Param search query string false "Tìm kiếm theo tên trạm"
// @Param active query string false "Lọc theo trạng thái hoạt động (true/false)"
// @Param org_id query string false "Lọc theo ID đơn vị"
// @Param page query int false "Số trang"
// @Param size query int false "Số bản ghi mỗi trang"
// @Success 200 {object} web.Response{data=object{data=[]models.RiverStation,total=int}}
// @Router /admin/stations/river [get]
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
			{"share_all": true},
		})
	}

	items, total, err := h.service.ListRiverStations(c.Request.Context(), req)
	web.AssertNil(err)
	h.SendData(c, gin.H{"data": items, "total": total})
}
