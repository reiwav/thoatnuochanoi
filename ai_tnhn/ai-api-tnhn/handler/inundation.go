package handler

import (
	"ai-api-tnhn/handler/filters"
	"ai-api-tnhn/internal/dto"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/station/inundation"
	"ai-api-tnhn/utils/web"
	"fmt"
	"io"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type InundationHandler struct {
	web.JsonRender
	service     inundation.Service
	contextWith web.ContextWith
	tokenRepo   repository.Token
	userRepo    repository.User
	roleRepo    repository.Role
}

func NewInundationHandler(service inundation.Service, contextWith web.ContextWith, tokenRepo repository.Token, userRepo repository.User, roleRepo repository.Role) *InundationHandler {
	return &InundationHandler{
		service:     service,
		contextWith: contextWith,
		tokenRepo:   tokenRepo,
		userRepo:    userRepo,
		roleRepo:    roleRepo,
	}
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

	// 2. Bind Request DTO
	var req models.InundationReportBase
	if err := c.ShouldBind(&req); err != nil {
		h.SendError(c, web.BadRequest("Invalid request data: "+err.Error()))
		return
	}

	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
		h.SendError(c, web.Unauthorized("Vui lòng đăng nhập lại"))
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

func (h *InundationHandler) AddUpdateSituation2(c *gin.Context) {
	id := c.Param("id")
	var req dto.AddUpdateSitutionRequest
	if err := c.ShouldBind(&req); err != nil {
		h.SendError(c, web.BadRequest("Invalid request data: "+err.Error()))
		return
	}

	images := h.getImages(c)
	user, err := h.contextWith.GetUser(c)
	web.AssertNil(err)
	report, err := h.service.UpdateUpdateSitution(c.Request.Context(), user, id, req, images)
	web.AssertNil(err)
	h.SendData(c, report)
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
	id := c.Param("id")

	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
		h.SendError(c, web.Unauthorized("Vui lòng đăng nhập lại"))
		return
	}

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
	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
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

	err = h.service.QuickFinishV2(c.Request.Context(), user, req.PointID)
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
	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
		h.SendError(c, web.Unauthorized("Vui lòng đăng nhập lại"))
		return
	}

	req := filters.NewInundationReportListRequest()
	if err := c.ShouldBindQuery(req); err != nil {
		h.SendError(c, web.BadRequest("Invalid filter parameters: "+err.Error()))
		return
	}

	isAllowedAll := user.IsCompany
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
	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
		h.SendError(c, web.Unauthorized("Vui lòng đăng nhập lại"))
		return
	}

	isAllowedAll := user.IsCompany
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
	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
		h.SendError(c, web.Unauthorized("Vui lòng đăng nhập lại"))
		return
	}

	orgIDFilter := c.Query("org_id")
	if orgIDFilter == "" {
		orgIDFilter = user.OrgID
	}
	result, err := h.service.ListPointsByOrg(c.Request.Context(), orgIDFilter)
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

	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
		h.SendError(c, web.Unauthorized("Vui lòng đăng nhập lại"))
		return
	}

	isAllowedAll := user.IsCompany

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

	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
		h.SendError(c, web.Unauthorized("Vui lòng đăng nhập lại"))
		return
	}

	isAllowedAll := user.IsCompany

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

	// Update only allowed fields while retaining others
	currentPoint.Name = req.Name
	currentPoint.Address = req.Address
	currentPoint.Lat = req.Lat
	currentPoint.Lng = req.Lng
	currentPoint.ShareAll = req.ShareAll
	if req.OrgID != "" {
		currentPoint.OrgID = req.OrgID
	}
	if currentPoint.ShareAll {
		currentPoint.SharedOrgIDs = []string{}
	} else {
		currentPoint.SharedOrgIDs = req.SharedOrgIDs
	}

	err = h.service.UpdatePoint(c.Request.Context(), id, currentPoint)
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

	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
		h.SendError(c, web.Unauthorized("Vui lòng đăng nhập lại"))
		return
	}

	isAllowedAll := user.IsCompany

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
	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
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

	err = h.service.ReviewUpdate(c.Request.Context(), user, id, req.Comment)
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
	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
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

	err = h.service.ReviewReport(c.Request.Context(), user, id, req.Comment)
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
	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
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

	err = h.service.UpdateReport(c.Request.Context(), user, id, &req, images)
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
	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
		h.SendError(c, web.Unauthorized("Vui lòng đăng nhập lại"))
		return
	}

	reportID := c.Param("id")
	var req dto.AddUpdateSitutionRequest
	if err := c.ShouldBind(&req); err != nil {
		h.SendError(c, web.BadRequest("Invalid request data: "+err.Error()))
		return
	}

	images := h.getImages(c)

	// updatedUpdate := &models.InundationUpdate{
	// 	ReportID: id,
	// 	InundationReportBase: models.InundationReportBase{
	// 		Description: req.Description,
	// 		Depth:       req.Depth,
	// 		Length:      req.Length,
	// 		Width:       req.Width,
	// 		ReportBase: models.ReportBase{
	// 			TrafficStatus: req.TrafficStatus,
	// 		},
	// 	},
	// }

	err = h.service.UpdateUpdateContent2(c.Request.Context(), user, reportID, req, images)
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
	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
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

	err = h.service.UpdateSurvey(c.Request.Context(), user, id, &req, images)
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
	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
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
	err = h.service.UpdateMech(c.Request.Context(), user, id, &req, images)
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

	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
		h.SendError(c, web.Unauthorized("Vui lòng đăng nhập lại"))
		return
	}

	isAllowedAll := user.IsCompany

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

	user, err := h.contextWith.GetUser(c)
	if err != nil || user == nil {
		h.SendError(c, web.Unauthorized("Vui lòng đăng nhập lại"))
		return
	}

	isAllowedAll := user.IsCompany

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

// StreamSSE godoc
// @Summary SSE stream cho real-time cập nhật điểm ngập
// @Description Kết nối SSE để nhận thông báo khi điểm ngập thay đổi (targeted theo permission)
// @Tags Ngập lụt
// @Produce text/event-stream
// @Param token query string true "Access token"
// @Success 200 {string} string "SSE stream"
// @Router /inundation/stream [get]
func (h *InundationHandler) StreamSSE(c *gin.Context) {
	// 1. Authenticate via query param
	token := c.Query("token")
	if token == "" {
		c.JSON(401, gin.H{"error": "token is required"})
		return
	}

	tok, err := h.tokenRepo.GetByID(c.Request.Context(), token)
	if err != nil || tok == nil {
		c.JSON(401, gin.H{"error": "invalid token"})
		return
	}

	user, err := h.userRepo.GetByID(c.Request.Context(), tok.UserID)
	if err != nil || user == nil {
		c.JSON(401, gin.H{"error": "user not found"})
		return
	}

	// Populate role fields
	if roleData, _ := h.roleRepo.GetByCode(c.Request.Context(), user.Role); roleData != nil {
		user.IsEmployee = roleData.IsEmployee
		user.IsCompany = roleData.IsCompany
		if !user.IsCompany {
			user.OrgID = tok.OrgID
		}
	}

	// 2. Subscribe to SSE Hub
	hub := h.service.GetHub()
	if hub == nil {
		c.JSON(500, gin.H{"error": "SSE hub not available"})
		return
	}

	sub := &inundation.Subscriber{
		UserID:      user.ID,
		OrgID:       user.OrgID,
		Role:        user.Role,
		IsCompany:   user.IsCompany,
		IsEmployee:  user.IsEmployee,
		AssignedIDs: user.AssignedInundationStationIDs,
	}
	ch := hub.Subscribe(sub)

	// 3. Set SSE headers
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no") // Disable nginx buffering
	c.Writer.Flush()

	// Send initial connection event
	fmt.Fprintf(c.Writer, "event: connected\ndata: ok\n\n")
	c.Writer.Flush()

	// 4. Stream events
	clientGone := c.Request.Context().Done()
	heartbeat := time.NewTicker(30 * time.Second)
	defer heartbeat.Stop()
	defer hub.Unsubscribe(user.ID)

	for {
		select {
		case <-clientGone:
			return
		case event, ok := <-ch:
			if !ok {
				// Channel closed (user reconnected elsewhere)
				return
			}
			fmt.Fprintf(c.Writer, "event: %s\ndata: {}\n\n", event)
			c.Writer.Flush()
			// Check if client is still connected
			if _, err := io.WriteString(c.Writer, ""); err != nil {
				return
			}
		case <-heartbeat.C:
			fmt.Fprintf(c.Writer, ": heartbeat\n\n")
			c.Writer.Flush()
		}
	}
}
