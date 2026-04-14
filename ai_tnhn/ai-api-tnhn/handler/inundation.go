package handler

import (
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
	return user.IsCompany, user
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
	if user.IsEmployee {
		isAssigned := false
		for _, pid := range user.AssignedInundationStationIDs {
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
	if user.IsEmployee {
		report, err := h.service.GetReport(c.Request.Context(), reportID)
		if err == nil && report != nil {
			isAssigned := false
			for _, pid := range user.AssignedInundationStationIDs {
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
		if !user.IsCompany && report.OrgID != user.OrgID {
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
	isAllowedAll, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Invalid user session"))
		return
	}

	orgID := user.OrgID
	if isAllowedAll {
		// Privileged users (Super Admin or Company level) can manage all
		if qOrg := c.Query("org_id"); qOrg != "" {
			orgID = qOrg
		} else {
			orgID = "" // Default to all if no filter provided
		}
	} else {
		// Restricted users stick to their own OrgID
		orgID = user.OrgID
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "0"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "10"))
	status := c.Query("status")
	trafficStatus := c.Query("traffic_status")
	query := c.Query("query")

	// Determine which points to show
	var pointIDs []string

	// Use target organization's configured InundationIDs if available
	targetOrgID := ""
	if qOrg := c.Query("org_id"); qOrg != "" && isAllowedAll {
		targetOrgID = qOrg
	} else if !isAllowedAll {
		targetOrgID = user.OrgID
	}

	if user.IsEmployee && !isAllowedAll {
		// Filter out empty strings if any
		for _, pid := range user.AssignedInundationStationIDs {
			if pid != "" {
				pointIDs = append(pointIDs, pid)
			}
		}
		if len(pointIDs) == 0 {
			// If no points assigned to employee, return empty result
			h.SendData(c, gin.H{
				"data":  []interface{}{},
				"total": 0,
			})
			return
		}
	} else if targetOrgID != "" {
		// Manager or Admin: search for points owned by OR shared with targetOrgID
		res, err := h.service.GetPointsStatus(c.Request.Context(), targetOrgID, nil) // passing nil pointIDs will fetch by org
		if err == nil {
			for _, p := range res {
				pointIDs = append(pointIDs, p.ID)
			}
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
	isAllowedAll, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Invalid user session"))
		return
	}

	var orgID string
	var pointIDs []string

	if user.IsEmployee && !isAllowedAll {
		// Employee: chỉ lấy điểm ngập đã gắn trong tài khoản
		for _, pid := range user.AssignedInundationStationIDs {
			if pid != "" {
				pointIDs = append(pointIDs, pid)
			}
		}
		if len(pointIDs) == 0 {
			h.SendData(c, []inundation.PointStatus{})
			return
		}
		orgID = "" // không fetch theo org
	} else if isAllowedAll {
		// Super admin / Company: lấy tất cả hoặc theo org_id filter
		if qOrg := c.Query("org_id"); qOrg != "" {
			orgID = qOrg
		}
	} else {
		// Manager (non-employee, non-superadmin): lấy theo org
		orgID = user.OrgID
	}

	res, err := h.service.GetPointsStatus(c.Request.Context(), orgID, pointIDs)
	if err != nil {
		h.SendError(c, err)
		return
	}

	h.SendData(c, res)
}

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

	if !isAllowedAll || req.OrgID == "" {
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

	// Fetch current point to retain org ID if not provided, or if user is not authorized
	currentPoint, err := h.service.GetPointByID(c.Request.Context(), id)
	if err != nil || currentPoint == nil {
		h.SendError(c, web.NotFound("Point not found"))
		return
	}

	// Ownership check
	if !isAllowedAll && currentPoint.OrgID != user.OrgID {
		h.SendError(c, web.Unauthorized("Access denied: You do not have permission to modify this point"))
		return
	}

	if !isAllowedAll {
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

	isAllowedAll, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Invalid user session"))
		return
	}

	if !isAllowedAll {
		currentPoint, err := h.service.GetPointByID(c.Request.Context(), id)
		if err == nil && currentPoint != nil && currentPoint.OrgID != user.OrgID {
			h.SendError(c, web.Unauthorized("Access denied: You do not have permission to delete this point"))
			return
		}
	}

	err := h.service.DeletePoint(c.Request.Context(), id)
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

	isAllowedAll, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Invalid user session"))
		return
	}

	// RBAC: Block Employee
	if user.IsEmployee {
		h.SendError(c, web.Forbidden("Nhân viên không có quyền nhận xét bản tin"))
		return
	}

	// RBAC: Check permissions
	update, err := h.service.GetUpdateByID(c.Request.Context(), updateID)
	if err != nil {
		h.SendError(c, err)
		return
	}

	report, err := h.service.GetReport(c.Request.Context(), update.ReportID)
	if err != nil {
		h.SendError(c, err)
		return
	}

	if !isAllowedAll {
		// Ownership or Shared Point check
		isAuthorized := report.OrgID == user.OrgID
		if !isAuthorized && user.OrgID != "" {
			// Check if the point itself is shared with user's org
			point, err := h.service.GetPointByID(c.Request.Context(), report.PointID)
			if err == nil && point != nil {
				for _, sid := range point.SharedOrgIDs {
					if sid == user.OrgID {
						isAuthorized = true
						break
					}
				}
			}
		}

		if !isAuthorized {
			h.SendError(c, web.Unauthorized("Bạn không có quyền nhận xét bản tin này"))
			return
		}
	}

	err = h.service.ReviewUpdate(c.Request.Context(), updateID, req.Comment, user.ID, user.Email, user.Name)
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

	isAllowedAll, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Invalid user session"))
		return
	}

	// RBAC: Block Employee
	if user.IsEmployee {
		h.SendError(c, web.Forbidden("Nhân viên không có quyền nhận xét bản tin"))
		return
	}

	// Check permissions
	report, err := h.service.GetReport(c.Request.Context(), reportID)
	if err != nil {
		h.SendError(c, err)
		return
	}

	// Ownership or Shared Point Check: Only allow review if same org, shared point, or isAllowedAll
	if !isAllowedAll {
		isAuthorized := report.OrgID == user.OrgID
		if !isAuthorized && user.OrgID != "" {
			// Check if the point itself is shared with user's org
			point, err := h.service.GetPointByID(c.Request.Context(), report.PointID)
			if err == nil && point != nil {
				for _, sid := range point.SharedOrgIDs {
					if sid == user.OrgID {
						isAuthorized = true
						break
					}
				}
			}
		}

		if !isAuthorized {
			h.SendError(c, web.Unauthorized("Bạn không có quyền nhận xét bản tin này"))
			return
		}
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

	isAllowedAll, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Invalid user session"))
		return
	}

	// Fetch existing report to check permissions
	existing, err := h.service.GetReport(c.Request.Context(), id)
	if err != nil {
		h.SendError(c, err)
		return
	}

	if user.IsEmployee {
		// Employees can ONLY edit if NeedsCorrection is true AND it belongs to their org
		if !existing.NeedsCorrection {
			h.SendError(c, web.Forbidden("Chỉ được phép sửa thông tin khi có yêu cầu (nhận xét) từ người rà soát"))
			return
		}
		if existing.OrgID != user.OrgID {
			h.SendError(c, web.Unauthorized("Bạn không có quyền chỉnh sửa báo cáo của đơn vị khác"))
			return
		}
	} else if !isAllowedAll {
		// Non-employee manager check (Ownership or Shared)
		isAuthorized := existing.OrgID == user.OrgID
		if !isAuthorized && user.OrgID != "" {
			point, err := h.service.GetPointByID(c.Request.Context(), existing.PointID)
			if err == nil && point != nil {
				for _, sid := range point.SharedOrgIDs {
					if sid == user.OrgID {
						isAuthorized = true
						break
					}
				}
			}
		}
		if !isAuthorized {
			h.SendError(c, web.Unauthorized("Bạn không có quyền chỉnh sửa báo cáo này"))
			return
		}
	}

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

	err = h.service.UpdateReport(c.Request.Context(), id, updatedField, images)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}

func (h *InundationHandler) UpdateSituationUpdateContent(c *gin.Context) {
	updateID := c.Param("id")

	isAllowedAll, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Invalid user session"))
		return
	}

	// Fetch existing update to check permissions
	existing, err := h.service.GetUpdateByID(c.Request.Context(), updateID)
	if err != nil {
		h.SendError(c, err)
		return
	}

	// Fetch parent report to get OrgID
	report, err := h.service.GetReport(c.Request.Context(), existing.ReportID)
	if err != nil {
		h.SendError(c, err)
		return
	}

	if user.IsEmployee {
		// Employees can ONLY edit if NeedsCorrection is true AND it belongs to their org
		if !existing.NeedsCorrection {
			h.SendError(c, web.Forbidden("Chỉ được phép sửa thông tin khi có yêu cầu (nhận xét) từ người rà soát"))
			return
		}
		if report.OrgID != user.OrgID {
			h.SendError(c, web.Unauthorized("Bạn không có quyền chỉnh sửa bản tin của đơn vị khác"))
			return
		}
	} else if !isAllowedAll {
		// Non-employee manager check (Ownership or Shared)
		isAuthorized := report.OrgID == user.OrgID
		if !isAuthorized && user.OrgID != "" {
			point, err := h.service.GetPointByID(c.Request.Context(), report.PointID)
			if err == nil && point != nil {
				for _, sid := range point.SharedOrgIDs {
					if sid == user.OrgID {
						isAuthorized = true
						break
					}
				}
			}
		}
		if !isAuthorized {
			h.SendError(c, web.Unauthorized("Bạn không có quyền chỉnh sửa bản tin này"))
			return
		}
	}

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

	err = h.service.UpdateUpdateContent(c.Request.Context(), updateID, updatedUpdate, images)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}
func (h *InundationHandler) UpdateSurvey(c *gin.Context) {
	id := c.Param("id")

	isAllowedAll, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Invalid user session"))
		return
	}

	// Fetch existing report to check permissions
	existing, err := h.service.GetReport(c.Request.Context(), id)
	if err != nil {
		h.SendError(c, err)
		return
	}

	if !isAllowedAll {
		isAuthorized := existing.OrgID == user.OrgID
		if !isAuthorized && user.OrgID != "" {
			point, err := h.service.GetPointByID(c.Request.Context(), existing.PointID)
			if err == nil && point != nil {
				for _, sid := range point.SharedOrgIDs {
					if sid == user.OrgID {
						isAuthorized = true
						break
					}
				}
			}
		}
		if !isAuthorized {
			h.SendError(c, web.Unauthorized("Bạn không có quyền cập nhật thông tin khảo sát"))
			return
		}
	}

	form, _ := c.MultipartForm()
	updatedField := &models.InundationReport{
		SurveyChecked: c.PostForm("survey_checked") == "true",
		SurveyNote:    c.PostForm("survey_note"),
		SurveyUserID:  user.ID,
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

	err = h.service.UpdateSurvey(c.Request.Context(), id, updatedField, user.Email, user.Name, images)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}

func (h *InundationHandler) UpdateMech(c *gin.Context) {
	id := c.Param("id")

	isAllowedAll, user := h.checkPermissions(c)
	if user == nil {
		h.SendError(c, web.Unauthorized("Invalid user session"))
		return
	}

	// Fetch existing report to check permissions
	existing, err := h.service.GetReport(c.Request.Context(), id)
	if err != nil {
		h.SendError(c, err)
		return
	}

	if !isAllowedAll {
		isAuthorized := existing.OrgID == user.OrgID
		if !isAuthorized && user.OrgID != "" {
			point, err := h.service.GetPointByID(c.Request.Context(), existing.PointID)
			if err == nil && point != nil {
				for _, sid := range point.SharedOrgIDs {
					if sid == user.OrgID {
						isAuthorized = true
						break
					}
				}
			}
		}
		if !isAuthorized {
			h.SendError(c, web.Unauthorized("Bạn không có quyền cập nhật thông tin cơ giới"))
			return
		}
	}

	form, _ := c.MultipartForm()
	updatedField := &models.InundationReport{
		MechChecked: c.PostForm("mech_checked") == "true",
		MechNote:    c.PostForm("mech_note"),
		MechD:       c.PostForm("mech_d"),
		MechR:       c.PostForm("mech_r"),
		MechS:       c.PostForm("mech_s"),
		MechUserID:  user.ID,
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

	err = h.service.UpdateMech(c.Request.Context(), id, updatedField, user.Email, user.Name, images)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, true)
}
