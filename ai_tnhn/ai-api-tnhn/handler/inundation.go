package handler

import (
	"ai-api-tnhn/constant"
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

func (h *InundationHandler) CreateReport(c *gin.Context) {
	// 1. Get User Info from token
	token := h.contextWith.GetToken(c.Request)
	user, err := h.authService.GetProfile(c.Request.Context(), token)
	if err != nil {
		h.SendError(c, web.Unauthorized("Invalid user session"))
		return
	}

	// 2. Parse Multipart Form
	form, err := c.MultipartForm()
	if err != nil {
		h.SendError(c, web.BadRequest("Failed to parse form: "+err.Error()))
		return
	}

	streetName := c.PostForm("street_name")
	depth := c.PostForm("depth")
	length := c.PostForm("length")
	width := c.PostForm("width")
	pointID := c.PostForm("point_id")
	description := c.PostForm("description")
	trafficStatus := c.PostForm("traffic_status")
	startTimeStr := c.PostForm("start_time")

	startTime, _ := strconv.ParseInt(startTimeStr, 10, 64)
	if startTime == 0 {
		startTime = time.Now().Unix()
	}

	// 3. Prepare images
	var images []inundation.ImageContent
	files := form.File["images"]
	for _, fileHeader := range files {
		file, err := fileHeader.Open()
		if err != nil {
			h.SendError(c, web.InternalServerError("Failed to open image: "+err.Error()))
			return
		}
		defer file.Close()

		images = append(images, inundation.ImageContent{
			Name:     fileHeader.Filename,
			MimeType: fileHeader.Header.Get("Content-Type"),
			Reader:   file,
		})
	}

	// 4. Create Report
	report := &models.InundationReport{
		OrgID:         user.OrgID,
		UserID:        user.ID,
		UserEmail:     user.Email,
		PointID:       pointID,
		StreetName:    streetName,
		Depth:         depth,
		Length:        length,
		Width:         width,
		StartTime:     startTime,
		Description:   description,
		TrafficStatus: trafficStatus,
	}

	// 4.1 Permission Check for Employee
	if user.Role == constant.ROLE_CONG_NHAN_CTY {
		isAssigned := false
		for _, pid := range user.AssignedInundationPointIDs {
			if pid == pointID {
				isAssigned = true
				break
			}
		}
		if !isAssigned {
			h.SendError(c, web.Forbidden("Bạn không có quyền gửi báo cáo cho địa điểm này"))
			return
		}
	}

	err = h.service.CreateReport(c.Request.Context(), report, images)
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, report)
}

func (h *InundationHandler) AddUpdateSituation(c *gin.Context) {
	// 1. Get User Info from token
	token := h.contextWith.GetToken(c.Request)
	user, err := h.authService.GetProfile(c.Request.Context(), token)
	if err != nil {
		h.SendError(c, web.Unauthorized("Invalid user session"))
		return
	}

	reportID := c.Param("id")

	// 2. Parse Form
	form, err := c.MultipartForm()
	if err != nil {
		h.SendError(c, web.BadRequest("Failed to parse form"))
		return
	}

	description := c.PostForm("description")
	depth := c.PostForm("depth")
	length := c.PostForm("length")
	width := c.PostForm("width")
	trafficStatus := c.PostForm("traffic_status")

	// 2. Prepare images
	var images []inundation.ImageContent
	files := form.File["images"]
	for _, fileHeader := range files {
		file, err := fileHeader.Open()
		if err != nil {
			h.SendError(c, web.InternalServerError("Failed to open image: "+err.Error()))
			return
		}
		defer file.Close()

		images = append(images, inundation.ImageContent{
			Name:     fileHeader.Filename,
			MimeType: fileHeader.Header.Get("Content-Type"),
			Reader:   file,
		})
	}

	// 3. Add Update
	update := &models.InundationUpdate{
		Description:   description,
		Depth:         depth,
		Length:        length,
		Width:         width,
		TrafficStatus: trafficStatus,
		Timestamp:     time.Now().Unix(),
	}

	// 3.1 Permission Check for Employee
	if user.Role == constant.ROLE_CONG_NHAN_CTY {
		report, err := h.service.GetReport(c.Request.Context(), reportID)
		if err == nil && report != nil {
			isAssigned := false
			for _, pid := range user.AssignedInundationPointIDs {
				if pid == report.PointID {
					isAssigned = true
					break
				}
			}
			if !isAssigned {
				h.SendError(c, web.Forbidden("Bạn không có quyền cập nhật cho địa điểm này"))
				return
			}
		}
	}

	err = h.service.AddUpdate(c.Request.Context(), reportID, update, user.ID, user.Email, images)
	if err != nil {
		h.SendError(c, err)
		return
	}

	// 4. Resolve if flag set
	resolve := c.PostForm("resolve") == "true"
	if resolve {
		_ = h.service.Resolve(c.Request.Context(), reportID, 0)
	}

	h.SendData(c, update)
}

func (h *InundationHandler) GetReport(c *gin.Context) {
	id := c.Param("id")
	report, err := h.service.GetReport(c.Request.Context(), id)
	if err != nil {
		h.SendError(c, err)
		return
	}

	// RBAC: Check visibility
	token := h.contextWith.GetToken(c.Request)
	user, err := h.authService.GetProfile(c.Request.Context(), token)
	if err == nil && user != nil {
		isSuperAdmin := user.Role == constant.ROLE_SUPER_ADMIN ||
			user.Role == "supper_admin" ||
			user.Role == "supper_admib" ||
			user.Role == "super_admin "

		isTNHN := false
		org, errOrg := h.service.GetOrgByID(c.Request.Context(), user.OrgID)
		if errOrg == nil && org != nil && (org.Code == "TNHN" || org.Code == "tnhn") {
			isTNHN = true
		}

		if !isSuperAdmin && !isTNHN && report.OrgID != user.OrgID {
			h.SendError(c, web.Unauthorized("Access denied: You do not have permission to view this report"))
			return
		}
	}

	h.SendData(c, report)
}

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

func (h *InundationHandler) ListReports(c *gin.Context) {
	token := h.contextWith.GetToken(c.Request)
	user, err := h.authService.GetProfile(c.Request.Context(), token)
	if err != nil {
		h.SendError(c, web.Unauthorized("Invalid user session"))
		return
	}

	// Check if user is Super Admin or belongs to Headquarters (TNHN)
	isSuperAdmin := user.Role == constant.ROLE_SUPER_ADMIN ||
		user.Role == "supper_admin" ||
		user.Role == "supper_admib" ||
		user.Role == "super_admin "

	isTNHN := false
	if user.OrgID != "" {
		org, err := h.service.GetOrgByID(c.Request.Context(), user.OrgID)
		if err == nil && org != nil && (org.Code == "TNHN" || org.Code == "tnhn") {
			isTNHN = true
		}
	}

	canSeeAll := isSuperAdmin || isTNHN

	orgID := user.OrgID
	if canSeeAll {
		// Privileged users can filter by any org_id from query
		if qOrg := c.Query("org_id"); qOrg != "" {
			orgID = qOrg
		} else {
			orgID = "" // Default to all for HQ/SuperAdmin if no filter provided
		}
	} else {
		// Restricted users always stick to their own OrgID, query param is ignored
		orgID = user.OrgID
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "0"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "10"))
	status := c.Query("status")
	trafficStatus := c.Query("traffic_status")
	query := c.Query("query")

	var pointIDs []string
	if user.Role == constant.ROLE_CONG_NHAN_CTY {
		pointIDs = user.AssignedInundationPointIDs
		if len(pointIDs) == 0 {
			// If no points assigned, return empty result
			h.SendData(c, gin.H{
				"data":  []interface{}{},
				"total": 0,
			})
			return
		}
	}

	reports, total, err := h.service.ListReportsWithFilter(c.Request.Context(), orgID, status, trafficStatus, query, pointIDs, page, size)
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, gin.H{
		"data":  reports,
		"total": total,
	})
}

func (h *InundationHandler) GetPointsStatus(c *gin.Context) {
	token := h.contextWith.GetToken(c.Request)
	user, err := h.authService.GetProfile(c.Request.Context(), token)
	if err != nil {
		h.SendError(c, web.Unauthorized("Invalid user session"))
		return
	}

	// Check if user is Super Admin or belongs to Headquarters (TNHN)
	isSuperAdmin := user.Role == constant.ROLE_SUPER_ADMIN ||
		user.Role == "supper_admin" ||
		user.Role == "supper_admib" ||
		user.Role == "super_admin "

	isTNHN := false
	if user.OrgID != "" {
		org, err := h.service.GetOrgByID(c.Request.Context(), user.OrgID)
		if err == nil && org != nil && (org.Code == "TNHN" || org.Code == "tnhn") {
			isTNHN = true
		}
	}

	canSeeAll := isSuperAdmin || isTNHN

	orgID := user.OrgID
	if canSeeAll {
		if qOrg := c.Query("org_id"); qOrg != "" {
			orgID = qOrg
		} else {
			orgID = "" // Default to all points for HQ
		}
	} else {
		orgID = user.OrgID
	}

	var pointIDs []string
	if user.Role == constant.ROLE_CONG_NHAN_CTY {
		pointIDs = user.AssignedInundationPointIDs
	}

	res, err := h.service.GetPointsStatus(c.Request.Context(), orgID, pointIDs)
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, res)
}

func (h *InundationHandler) CreatePoint(c *gin.Context) {
	var req models.InundationPoint
	if err := c.ShouldBindJSON(&req); err != nil {
		h.SendError(c, web.BadRequest("Invalid request: "+err.Error()))
		return
	}

	token := h.contextWith.GetToken(c.Request)
	user, err := h.authService.GetProfile(c.Request.Context(), token)
	if err != nil {
		h.SendError(c, web.Unauthorized("Invalid user session"))
		return
	}

	// Check if user is Super Admin or belongs to Headquarters (TNHN)
	isSuperAdmin := user.Role == constant.ROLE_SUPER_ADMIN ||
		user.Role == "supper_admin" ||
		user.Role == "supper_admib" ||
		user.Role == "super_admin "

	isTNHN := false
	if user.OrgID != "" {
		org, err := h.service.GetOrgByID(c.Request.Context(), user.OrgID)
		if err == nil && org != nil && (org.Code == "TNHN" || org.Code == "tnhn") {
			isTNHN = true
		}
	}

	canAssignOrg := isSuperAdmin || isTNHN

	if !canAssignOrg || req.OrgID == "" {
		req.OrgID = user.OrgID
	}

	id, err := h.service.CreatePoint(c.Request.Context(), req)
	if err != nil {
		h.SendError(c, err)
		return
	}
	req.ID = id
	h.SendData(c, req)
}

func (h *InundationHandler) UpdatePoint(c *gin.Context) {
	id := c.Param("id")
	var req models.InundationPoint
	if err := c.ShouldBindJSON(&req); err != nil {
		h.SendError(c, web.BadRequest("Invalid request: "+err.Error()))
		return
	}

	token := h.contextWith.GetToken(c.Request)
	user, err := h.authService.GetProfile(c.Request.Context(), token)
	if err != nil {
		h.SendError(c, web.Unauthorized("Invalid user session"))
		return
	}

	isSuperAdmin := user.Role == constant.ROLE_SUPER_ADMIN ||
		user.Role == "supper_admin" ||
		user.Role == "supper_admib" ||
		user.Role == "super_admin "

	isTNHN := false
	org, errOrg := h.service.GetOrgByID(c.Request.Context(), user.OrgID)
	if errOrg == nil && org != nil && (org.Code == "TNHN" || org.Code == "tnhn") {
		isTNHN = true
	}

	canAssignOrg := isSuperAdmin || isTNHN

	// Fetch current point to retain org ID if not provided, or if user is not authorized
	currentPoint, err := h.service.GetPointByID(c.Request.Context(), id)
	if err != nil || currentPoint == nil {
		h.SendError(c, web.NotFound("Point not found"))
		return
	}

	// Ownership check
	if !canAssignOrg && currentPoint.OrgID != user.OrgID {
		h.SendError(c, web.Unauthorized("Access denied: You do not have permission to modify this point"))
		return
	}

	if !canAssignOrg {
		req.OrgID = currentPoint.OrgID
	} else if req.OrgID == "" {
		req.OrgID = currentPoint.OrgID
	}

	err = h.service.UpdatePoint(c.Request.Context(), id, req)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}

func (h *InundationHandler) DeletePoint(c *gin.Context) {
	id := c.Param("id")

	// RBAC Check
	token := h.contextWith.GetToken(c.Request)
	user, err := h.authService.GetProfile(c.Request.Context(), token)
	if err != nil {
		h.SendError(c, web.Unauthorized("Invalid user session"))
		return
	}

	isSuperAdmin := user.Role == constant.ROLE_SUPER_ADMIN ||
		user.Role == "supper_admin" ||
		user.Role == "supper_admib" ||
		user.Role == "super_admin "

	isTNHN := false
	org, errOrg := h.service.GetOrgByID(c.Request.Context(), user.OrgID)
	if errOrg == nil && org != nil && (org.Code == "TNHN" || org.Code == "tnhn") {
		isTNHN = true
	}

	canManageAll := isSuperAdmin || isTNHN

	if !canManageAll {
		currentPoint, err := h.service.GetPointByID(c.Request.Context(), id)
		if err == nil && currentPoint != nil && currentPoint.OrgID != user.OrgID {
			h.SendError(c, web.Unauthorized("Access denied: You do not have permission to delete this point"))
			return
		}
	}

	err = h.service.DeletePoint(c.Request.Context(), id)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}
func (h *InundationHandler) ReviewUpdate(c *gin.Context) {
	updateID := c.Param("id")
	var req struct {
		Comment string `json:"comment"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		h.SendError(c, web.BadRequest("Invalid request body"))
		return
	}

	token := h.contextWith.GetToken(c.Request)
	user, _ := h.authService.GetProfile(c.Request.Context(), token)

	err := h.service.ReviewUpdate(c.Request.Context(), updateID, req.Comment, user.ID, user.Email, user.Name)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}

func (h *InundationHandler) ReviewReport(c *gin.Context) {
	reportID := c.Param("id")
	var req struct {
		Comment string `json:"comment"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		h.SendError(c, web.BadRequest("Invalid request body"))
		return
	}

	token := h.contextWith.GetToken(c.Request)
	user, _ := h.authService.GetProfile(c.Request.Context(), token)

	// Check permissions
	report, err := h.service.GetReport(c.Request.Context(), reportID)
	if err != nil {
		h.SendError(c, err)
		return
	}

	isSuperAdmin := user.Role == constant.ROLE_SUPER_ADMIN ||
		user.Role == "supper_admin" ||
		user.Role == "supper_admib" ||
		user.Role == "super_admin "

	isTNHN := false
	org, errOrg := h.service.GetOrgByID(c.Request.Context(), user.OrgID)
	if errOrg == nil && org != nil && (org.Code == "TNHN" || org.Code == "tnhn") {
		isTNHN = true
	}
	canSeeAll := isSuperAdmin || isTNHN

	// Ownership Check: Only allow review if same org or canSeeAll
	if !canSeeAll && report.OrgID != user.OrgID {
		h.SendError(c, web.Unauthorized("You do not have permission to review this report"))
		return
	}

	err = h.service.ReviewReport(c.Request.Context(), reportID, req.Comment, user.ID, user.Email, user.Name)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}

func (h *InundationHandler) UpdateReport(c *gin.Context) {
	id := c.Param("id")
	form, _ := c.MultipartForm()

	updatedField := &models.InundationReport{
		Description:   c.PostForm("description"),
		Depth:         c.PostForm("depth"),
		Length:        c.PostForm("length"),
		Width:         c.PostForm("width"),
		TrafficStatus: c.PostForm("traffic_status"),
	}

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

	err := h.service.UpdateReport(c.Request.Context(), id, updatedField, images)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}

func (h *InundationHandler) UpdateSituationUpdateContent(c *gin.Context) {
	updateID := c.Param("id")
	form, _ := c.MultipartForm()

	updatedUpdate := &models.InundationUpdate{
		Description:   c.PostForm("description"),
		Depth:         c.PostForm("depth"),
		Length:        c.PostForm("length"),
		Width:         c.PostForm("width"),
		TrafficStatus: c.PostForm("traffic_status"),
	}

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

	err := h.service.UpdateUpdateContent(c.Request.Context(), updateID, updatedUpdate, images)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}
