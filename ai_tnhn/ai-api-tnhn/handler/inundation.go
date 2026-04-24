package handler

import (
	"ai-api-tnhn/handler/filters"
	"ai-api-tnhn/internal/dto"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/auth"
	"ai-api-tnhn/internal/service/inundation"
	"ai-api-tnhn/utils/web"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type InundationHandler struct {
	web.JsonRender
	service     inundation.Service
	authService auth.Service
	contextWith web.ContextWith
}

func NewInundationHandler(service inundation.Service, authService auth.Service, contextWith web.ContextWith) *InundationHandler {
	return &InundationHandler{
		service:     service,
		authService: authService,
		contextWith: contextWith,
	}
}

func (h *InundationHandler) checkPermissions(c *gin.Context) (isAllowedAll bool, user *models.User) {
	token := h.contextWith.GetToken(c.Request)
	user, err := h.authService.GetProfile(c.Request.Context(), token)
	if err != nil || user == nil {
		return false, nil
	}

	// Logic động: Super Admin hoặc Role có flag IsCompany=true trong DB mới được xem tất cả
	isAllowedAll = user.Role == "super_admin" || user.IsCompany

	return isAllowedAll, user
}

// CreateReport godoc
// @Summary Tạo báo cáo ngập lụt mới (nhân viên xí nghiệp tạo)
// @Description Tạo một báo cáo ngập lụt mới với tùy chọn đính kèm hình ảnh
// @Tags Ngập lụt
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param report formData dto.CreateReportRequest true "Dữ liệu báo cáo"
// @Param images formData file false "Hình ảnh hiện trường"
// @Success 200 {object} models.InundationReport
// @Failure 401 {object} web.ErrorResponse
// @Failure 400 {object} web.ErrorResponse
// @Router /inundation/report [post]
func (h *InundationHandler) CreateReport(c *gin.Context) {
	// 1. Auth & Identification
	_, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Vui lòng đăng nhập lại"))
		return
	}

	// 2. Bind Request DTO
	var req models.InundationReportBase
	if err := c.ShouldBind(&req); err != nil {
		h.SendError(c, web.BadRequest("Invalid request data: "+err.Error()))
		return
	}

	// 3. Parse Multipart Form for images
	images := h.getImages(c)

	report, err := h.service.CreateReport(c.Request.Context(), user, req, images)
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, report)
}

// AddUpdateSituation godoc
// @Summary Thêm cập nhật tình hình
// @Description Thêm thông tin cập nhật cho một báo cáo ngập lụt hiện có
// @Tags Ngập lụt
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID báo cáo"
// @Param update formData dto.AddUpdateSitutionRequest true "Dữ liệu cập nhật"
// @Param images formData file false "Hình ảnh cập nhật"
// @Success 200 {object} models.InundationUpdate
// @Failure 401 {object} web.ErrorResponse
// @Router /inundation/{id}/update [post]
func (h *InundationHandler) AddUpdateSituation(c *gin.Context) {
	_, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Vui lòng đăng nhập lại"))
		return
	}

	id := c.Param("id")
	var req dto.AddUpdateSitutionRequest
	if err := c.ShouldBind(&req); err != nil {
		h.SendError(c, web.BadRequest("Invalid request data: "+err.Error()))
		return
	}

	images := h.getImages(c)

	update := &models.InundationUpdate{
		ReportID: id,
		InundationReportBase: models.InundationReportBase{
			Description:   req.Description,
			Depth:         req.Depth,
			TrafficStatus: req.TrafficStatus,
			Length:        req.Length,
			Width:         req.Width,
		},
	}

	err := h.service.AddUpdate(c.Request.Context(), user, id, update, images, req.Resolve)
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, update)
}

// GetReport godoc
// @Summary Lấy thông tin chi tiết báo cáo
// @Description Truy xuất thông tin chi tiết của một báo cáo ngập lụt theo ID
// @Tags Ngập lụt
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID báo cáo"
// @Success 200 {object} models.InundationReport
// @Failure 401 {object} web.ErrorResponse
// @Failure 404 {object} web.ErrorResponse
// @Router /inundation/report/{id} [get]
func (h *InundationHandler) GetReport(c *gin.Context) {
	_, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Vui lòng đăng nhập lại"))
		return
	}

	id := c.Param("id")
	report, err := h.service.GetReport(c.Request.Context(), user, id)
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, report)
}

// ListReportUpdates godoc
// @Summary Lấy danh sách cập nhật tình hình của một báo cáo
// @Description Truy xuất toàn bộ lịch sử cập nhật (diễn biến) của một báo cáo ngập lụt cụ thể
// @Tags Ngập lụt
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID báo cáo"
// @Success 200 {array} models.InundationUpdate
// @Failure 401 {object} web.ErrorResponse
// @Failure 404 {object} web.ErrorResponse
// @Router /inundation/report/{id}/updates [get]
func (h *InundationHandler) ListReportUpdates(c *gin.Context) {
	id := c.Param("id")
	updates, err := h.service.ListReportUpdates(c.Request.Context(), id)
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, updates)
}

// ResolveReport godoc
// @Summary Kết thúc báo cáo ngập lụt
// @Description Đánh dấu báo cáo ngập lụt đã được xử lý xong với thời gian kết thúc tùy chọn
// @Tags Ngập lụt
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID báo cáo"
// @Param request body object{end_time=int64} false "Dữ liệu kết thúc"
// @Success 200 {boolean} bool
// @Failure 401 {object} web.ErrorResponse
// @Router /inundation/report/{id}/resolve [post]
func (h *InundationHandler) ResolveReport(c *gin.Context) {
	reportID := c.Param("id")
	var req struct {
		EndTime int64 `json:"end_time"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		// Ignore error if not provided
	}

	err := h.service.Resolve(c.Request.Context(), reportID, req.EndTime)
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, true)
}

// QuickFinish godoc
// @Summary Kết thúc nhanh điểm ngập
// @Description Đánh dấu điểm ngập đã hết ngập nhanh chóng
// @Tags Ngập lụt
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param point_id body string true "ID điểm ngập"
// @Success 200 {boolean} bool
// @Failure 401 {object} web.ErrorResponse
// @Router /inundation/quick-finish [post]
func (h *InundationHandler) QuickFinish(c *gin.Context) {
	_, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Vui lòng đăng nhập lại"))
		return
	}

	var req struct {
		PointID string `json:"point_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		h.SendError(c, web.BadRequest("Invalid request data"))
		return
	}

	err := h.service.QuickFinish(c.Request.Context(), user, req.PointID)
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, true)
}

// ListReports godoc
// @Summary Danh sách báo cáo ngập lụt
// @Description Truy xuất danh sách báo cáo với các bộ lọc
// @Tags Ngập lụt
// @Produce json
// @Security BearerAuth
// @Param status query string false "Trạng thái"
// @Param traffic_status query string false "Tình trạng giao thông"
// @Param query query string false "Từ khóa tìm kiếm"
// @Param org_id query string false "ID đơn vị"
// @Param page query int false "Số trang"
// @Param size query int false "Số bản ghi mỗi trang"
// @Success 200 {object} object{data=[]models.InundationReport,total=int}
// @Router /inundation/reports [get]
func (h *InundationHandler) ListReports(c *gin.Context) {
	isAllowedAll, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Vui lòng đăng nhập lại"))
		return
	}

	req := filters.NewInundationReportListRequest()
	if err := c.ShouldBindQuery(req); err != nil {
		h.SendError(c, web.BadRequest("Invalid filter parameters: "+err.Error()))
		return
	}

	reports, total, err := h.service.ListReportsWithFilter(c.Request.Context(), user, isAllowedAll, req.OrgID, req)
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, gin.H{
		"data":  reports,
		"total": total,
	})
}

// GetPointsStatus godoc
// @Summary Lấy trạng thái tất cả các điểm ngập
// @Description Truy xuất trạng thái hiện tại của tất cả các điểm, có thể lọc theo đơn vị
// @Tags Ngập lụt
// @Produce json
// @Security BearerAuth
// @Param org_id query string false "Lọc theo ID đơn vị"
// @Success 200 {object} object
// @Failure 401 {object} web.ErrorResponse
// @Router /inundation/points-status [get]
func (h *InundationHandler) GetPointsStatus(c *gin.Context) {
	isAllowedAll, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Vui lòng đăng nhập lại"))
		return
	}

	orgIDFilter := c.Query("org_id")
	result, err := h.service.GetPointsStatus(c.Request.Context(), user, isAllowedAll, orgIDFilter)
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, result)
}

// ListPointsByOrg godoc
// @Summary Danh sách điểm ngập theo đơn vị
// @Description Truy xuất danh sách tất cả các điểm ngập thuộc quản lý của đơn vị
// @Tags Ngập lụt
// @Produce json
// @Security BearerAuth
// @Param org_id query string false "Lọc theo ID đơn vị (chỉ dùng cho Admin)"
// @Success 200 {array} models.InundationStation
// @Failure 401 {object} web.ErrorResponse
// @Router /inundation/points-list [get]
func (h *InundationHandler) ListPointsByOrg(c *gin.Context) {
	isAllowedAll, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Vui lòng đăng nhập lại"))
		return
	}

	orgIDFilter := c.Query("org_id")
	result, err := h.service.ListPointsByOrg(c.Request.Context(), user, isAllowedAll, orgIDFilter)
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, result)
}

// CreatePoint godoc
// @Summary Tạo mới điểm đo ngập
// @Description Tạo mới một điểm theo dõi ngập lụt
// @Tags Ngập lụt
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param point body models.InundationStation true "Dữ liệu điểm đo"
// @Success 200 {object} models.InundationStation
// @Failure 401 {object} web.ErrorResponse
// @Failure 400 {object} web.ErrorResponse
// @Router /inundation/points [post]
func (h *InundationHandler) CreatePoint(c *gin.Context) {
	var req models.InundationStation
	if err := c.ShouldBindJSON(&req); err != nil {
		h.SendError(c, web.BadRequest("Invalid request: "+err.Error()))
		return
	}

	isAllowedAll, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Invalid user session"))
		return
	}

	if !isAllowedAll && user.OrgID != req.OrgID && (!req.ShareAll || !web.Contains(req.SharedOrgIDs, user.OrgID)) {
		h.SendError(c, web.Unauthorized("Bạn không có quyền thêm điểm đo cho đơn vị khác"))
		return
	}

	if req.ShareAll {
		req.SharedOrgIDs = []string{}
	}

	id, err := h.service.CreatePoint(c.Request.Context(), req)
	if err != nil {
		h.SendError(c, err)
		return
	}
	req.ID = id
	h.SendData(c, req)
}

// UpdatePoint godoc
// @Summary Cập nhật điểm đo ngập
// @Description Cập nhật thông tin chi tiết của một điểm theo dõi ngập hiện có
// @Tags Ngập lụt
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID điểm đo"
// @Param point body models.InundationStation true "Dữ liệu điểm đo cập nhật"
// @Success 200 {boolean} bool
// @Failure 401 {object} web.ErrorResponse
// @Failure 404 {object} web.ErrorResponse
// @Router /inundation/points/{id} [put]
func (h *InundationHandler) UpdatePoint(c *gin.Context) {
	id := c.Param("id")
	var req models.InundationStation
	if err := c.ShouldBindJSON(&req); err != nil {
		h.SendError(c, web.BadRequest("Invalid request data: "+err.Error()))
		return
	}

	isAllowedAll, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Invalid user session"))
		return
	}

	// Fetch current point to retain org ID if not provided, or if user is not authorized
	currentPoint, err := h.service.GetPointByID(c.Request.Context(), id)
	if err != nil || currentPoint == nil {
		h.SendError(c, web.NotFound("Point not found"))
		return
	}

	// Ownership check: Only owner org or Company admin can modify
	if !isAllowedAll && currentPoint.OrgID != user.OrgID && (!req.ShareAll || !web.Contains(req.SharedOrgIDs, user.OrgID)) {
		h.SendError(c, web.Unauthorized("Bạn không có quyền chỉnh sửa điểm ngập của đơn vị khác"))
		return
	}

	point := models.InundationStation{
		Name:         req.Name,
		Address:      req.Address,
		Lat:          req.Lat,
		Lng:          req.Lng,
		OrgID:        req.OrgID,
		SharedOrgIDs: req.SharedOrgIDs,
		ShareAll:     req.ShareAll,
	}

	if point.OrgID == "" {
		point.OrgID = currentPoint.OrgID
	}

	err = h.service.UpdatePoint(c.Request.Context(), id, point)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}

// DeletePoint godoc
// @Summary Xóa điểm đo ngập
// @Description Loại bỏ một điểm theo dõi ngập theo ID
// @Tags Ngập lụt
// @Security BearerAuth
// @Param id path string true "ID điểm đo"
// @Success 200 {boolean} bool
// @Failure 401 {object} web.ErrorResponse
// @Failure 404 {object} web.ErrorResponse
// @Router /inundation/points/{id} [delete]
func (h *InundationHandler) DeletePoint(c *gin.Context) {
	id := c.Param("id")

	isAllowedAll, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Invalid user session"))
		return
	}

	// Ownership check: Only owner org or Company admin can delete
	currentPoint, err := h.service.GetPointByID(c.Request.Context(), id)
	if err != nil || currentPoint == nil {
		h.SendError(c, web.NotFound("Không tìm thấy điểm ngập"))
		return
	}

	if !isAllowedAll && currentPoint.OrgID != user.OrgID && !(currentPoint.ShareAll || web.Contains(currentPoint.SharedOrgIDs, user.OrgID)) {
		h.SendError(c, web.Unauthorized("Bạn không có quyền xóa điểm ngập của đơn vị khác"))
		return
	}

	err = h.service.DeletePoint(c.Request.Context(), id)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}

// ReviewUpdate godoc
// @Summary Đánh giá cập nhật tình hình
// @Description Thêm nhận xét đánh giá cho một bản cập nhật tình hình ngập
// @Tags Ngập lụt
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID cập nhật"
// @Param request body dto.ReviewRequest true "Dữ liệu đánh giá"
// @Success 200 {object} object{status=string}
// @Failure 401 {object} web.ErrorResponse
// @Router /inundation/update/{id}/review [post]
func (h *InundationHandler) ReviewUpdate(c *gin.Context) {
	_, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Vui lòng đăng nhập lại"))
		return
	}

	id := c.Param("id")
	var req dto.ReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.SendError(c, web.BadRequest("Invalid request body"))
		return
	}

	if req.Comment == "" {
		h.SendError(c, web.BadRequest("Nhận xét không được để trống"))
		return
	}

	err := h.service.ReviewUpdate(c.Request.Context(), user, id, req.Comment)
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, gin.H{"status": "success"})
}

// ReviewReport godoc
// @Summary Đánh giá báo cáo ngập lụt
// @Description Thêm nhận xét đánh giá cho một báo cáo ngập lụt
// @Tags Ngập lụt
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID báo cáo"
// @Param request body dto.ReviewRequest true "Dữ liệu đánh giá"
// @Success 200 {object} object{status=string}
// @Failure 401 {object} web.ErrorResponse
// @Router /inundation/report/{id}/review [post]
func (h *InundationHandler) ReviewReport(c *gin.Context) {
	_, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Vui lòng đăng nhập lại"))
		return
	}

	id := c.Param("id")
	var req dto.ReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.SendError(c, web.BadRequest("Invalid request body"))
		return
	}

	if req.Comment == "" {
		h.SendError(c, web.BadRequest("Nhận xét không được để trống"))
		return
	}

	err := h.service.ReviewReport(c.Request.Context(), user, id, req.Comment)
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, gin.H{"status": "success"})
}

// UpdateReport godoc
// @Summary Cập nhật báo cáo ngập lụt
// @Description Cập nhật thông tin chi tiết của báo cáo hiện có với tùy chọn hình ảnh
// @Tags Ngập lụt
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID báo cáo"
// @Param report formData dto.UpdateReportRequest true "Dữ liệu báo cáo"
// @Param images formData file false "Hình ảnh cập nhật"
// @Success 200 {boolean} bool
// @Failure 401 {object} web.ErrorResponse
// @Router /inundation/report/{id} [put]
func (h *InundationHandler) UpdateReport(c *gin.Context) {
	_, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Vui lòng đăng nhập lại"))
		return
	}

	id := c.Param("id")
	var req models.InundationReportBase
	if err := c.ShouldBind(&req); err != nil {
		h.SendError(c, web.BadRequest("Invalid request data: "+err.Error()))
		return
	}

	images := h.getImages(c)

	err := h.service.UpdateReport(c.Request.Context(), user, id, &req, images)
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, true)
}

// UpdateSituationUpdateContent godoc
// @Summary Cập nhật nội dung cập nhật tình hình
// @Description Cập nhật nội dung của một bản cập nhật tình hình hiện có
// @Tags Ngập lụt
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID bản cập nhật"
// @Param update formData dto.AddUpdateSitutionRequest true "Dữ liệu cập nhật"
// @Param images formData file false "Hình ảnh cập nhật"
// @Success 200 {boolean} bool
// @Failure 401 {object} web.ErrorResponse
// @Router /inundation/update/{id} [put]
func (h *InundationHandler) UpdateSituationUpdateContent(c *gin.Context) {
	_, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Vui lòng đăng nhập lại"))
		return
	}

	id := c.Param("id")
	var req dto.AddUpdateSitutionRequest
	if err := c.ShouldBind(&req); err != nil {
		h.SendError(c, web.BadRequest("Invalid request data: "+err.Error()))
		return
	}

	images := h.getImages(c)

	updatedUpdate := &models.InundationUpdate{
		ReportID: id,
		InundationReportBase: models.InundationReportBase{
			Description:   req.Description,
			Depth:         req.Depth,
			Length:        req.Length,
			Width:         req.Width,
			TrafficStatus: req.TrafficStatus,
		},
	}

	err := h.service.UpdateUpdateContent(c.Request.Context(), user, updatedUpdate, images)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}

// UpdateSurvey godoc
// @Summary Cập nhật trạng thái khảo sát
// @Description Cập nhật trạng thái đã kiểm tra và ghi chú khảo sát của báo cáo
// @Tags Ngập lụt
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID báo cáo"
// @Param request formData dto.CreateReportRequest true "Dữ liệu khảo sát"
// @Param images formData file false "Hình ảnh khảo sát"
// @Success 200 {boolean} bool
// @Failure 401 {object} web.ErrorResponse
// @Router /inundation/report/{id}/survey [put]
func (h *InundationHandler) UpdateSurvey(c *gin.Context) {
	_, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Vui lòng đăng nhập lại"))
		return
	}

	id := c.Param("id")
	var req models.ReportSurveyBase
	if err := c.ShouldBind(&req); err != nil {
		h.SendError(c, web.BadRequest("Invalid request data: "+err.Error()))
		return
	}
	images := h.getImages(c)

	err := h.service.UpdateSurvey(c.Request.Context(), user, id, &req, images)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}

// UpdateMech godoc
// @Summary Cập nhật trạng thái cơ giới hóa
// @Description Cập nhật trạng thái kiểm tra cơ giới, ghi chú và các giá trị D/R/S
// @Tags Ngập lụt
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID báo cáo"
// @Param request formData dto.CreateReportRequest true "Dữ liệu cơ giới"
// @Param images formData file false "Hình ảnh cơ giới"
// @Success 200 {boolean} bool
// @Failure 401 {object} web.ErrorResponse
// @Router /inundation/report/{id}/mech [put]
func (h *InundationHandler) UpdateMech(c *gin.Context) {
	_, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Vui lòng đăng nhập lại"))
		return
	}

	id := c.Param("id")
	var req models.ReportMechBase
	if err := c.ShouldBind(&req); err != nil {
		h.SendError(c, web.BadRequest("Invalid request data: "+err.Error()))
		return
	}
	images := h.getImages(c)
	err := h.service.UpdateMech(c.Request.Context(), user, id, &req, images)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}

// GetYearlyHistory godoc
// @Summary Lấy lịch sử ngập lụt theo năm
// @Description Truy xuất lịch sử các báo cáo ngập lụt cho một năm cụ thể
// @Tags Ngập lụt
// @Produce json
// @Security BearerAuth
// @Param year query int false "Năm"
// @Param org_id query string false "Lọc theo ID đơn vị"
// @Success 200 {array} models.InundationReport
// @Failure 401 {object} web.ErrorResponse
// @Router /inundation/yearly-history [get]
func (h *InundationHandler) GetYearlyHistory(c *gin.Context) {
	yearStr := c.Query("year")
	year, _ := strconv.Atoi(yearStr)
	if year == 0 {
		year = time.Now().Year()
	}

	isAllowedAll, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Invalid user session"))
		return
	}

	orgID := user.OrgID
	if isAllowedAll {
		orgID = c.Query("org_id")
	}

	reports, err := h.service.GetYearlyHistory(c.Request.Context(), orgID, year)
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, reports)
}

// ExportYearlyHistory godoc
// @Summary Xuất lịch sử ngập lụt theo năm ra Excel
// @Description Xuất lịch sử báo cáo ngập lụt của một năm cụ thể ra tệp Excel
// @Tags Ngập lụt
// @Produce application/octet-stream
// @Security BearerAuth
// @Param year query int false "Năm"
// @Param org_id query string false "Lọc theo ID đơn vị"
// @Success 200 {file} file
// @Failure 401 {object} web.ErrorResponse
// @Router /inundation/yearly-history/export [get]
func (h *InundationHandler) ExportYearlyHistory(c *gin.Context) {
	yearStr := c.Query("year")
	year, _ := strconv.Atoi(yearStr)
	if year == 0 {
		year = time.Now().Year()
	}

	isAllowedAll, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Invalid user session"))
		return
	}

	orgID := user.OrgID
	if isAllowedAll {
		orgID = c.Query("org_id")
	}

	filePath, err := h.service.ExportYearlyHistory(c.Request.Context(), orgID, year)
	if err != nil {
		h.SendError(c, err)
		return
	}

	c.File(filePath)
}

func (h *InundationHandler) getImages(c *gin.Context) []inundation.ImageContent {
	form, _ := c.MultipartForm()
	var images []inundation.ImageContent
	if form != nil {
		files := form.File["images"]
		for _, fileHeader := range files {
			file, err := fileHeader.Open()
			if err == nil {
				images = append(images, inundation.ImageContent{
					Name:     fileHeader.Filename,
					MimeType: fileHeader.Header.Get("Content-Type"),
					Reader:   file,
				})
				defer file.Close()
			}
		}
	}
	return images
}
