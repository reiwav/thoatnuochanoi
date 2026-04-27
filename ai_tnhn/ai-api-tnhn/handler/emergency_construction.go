package handler

import (
	"ai-api-tnhn/handler/filters"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/station/emergency_construction"
	"ai-api-tnhn/utils/web"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"go.mongodb.org/mongo-driver/bson"

	"github.com/gin-gonic/gin"
)

type EmergencyConstructionHandler struct {
	web.JsonRender
	web.ClientCache
	service       emergency_construction.Service
	aiChatLogRepo repository.AiChatLog
}

func NewEmergencyConstructionHandler(service emergency_construction.Service, aiChatLogRepo repository.AiChatLog) *EmergencyConstructionHandler {
	return &EmergencyConstructionHandler{
		service:       service,
		aiChatLogRepo: aiChatLogRepo,
	}
}

func (h *EmergencyConstructionHandler) checkPermissions(c *gin.Context) (isSuperAdmin bool, isAllowedAll bool, client *web.ClientCache) {
	client = h.GetTokenFromContext(c)
	if client == nil {
		return false, false, nil
	}

	isAllowedAll = client.IsCompany
	return false, isAllowedAll, client
}

// Create godoc
// @Summary Tạo mới một dự án công trình khẩn cấp
// @Description Đăng ký một dự án công trình khẩn cấp mới vào hệ thống
// @Tags Công trình khẩn cấp
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param construction body models.EmergencyConstruction true "Dữ liệu dự án"
// @Success 200 {object} web.Response{data=models.EmergencyConstruction}
// @Failure 401 {object} web.ErrorResponse
// @Router /admin/emergency-constructions [post]
func (h *EmergencyConstructionHandler) Create(c *gin.Context) {
	var item models.EmergencyConstruction
	if err := c.ShouldBindJSON(&item); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	userID := h.GetTokenFromContext(c).UserID
	err := h.service.Create(c.Request.Context(), &item, userID)
	web.AssertNil(err)
	h.SendData(c, item)
}

// Update godoc
// @Summary Cập nhật dự án công trình khẩn cấp
// @Description Cập nhật thông tin chi tiết của một dự án công trình khẩn cấp hiện có
// @Tags Công trình khẩn cấp
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID dự án"
// @Param construction body models.EmergencyConstruction true "Dư liệu dự án cập nhật"
// @Success 200 {object} web.Response{data=models.EmergencyConstruction}
// @Failure 401 {object} web.ErrorResponse
// @Router /admin/emergency-constructions/{id} [put]
func (h *EmergencyConstructionHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var item models.EmergencyConstruction
	if err := c.ShouldBindJSON(&item); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	userID := h.GetTokenFromContext(c).UserID
	err := h.service.Update(c.Request.Context(), id, &item, userID)
	web.AssertNil(err)
	h.SendData(c, item)
}

// Delete godoc
// @Summary Xóa dự án công trình khẩn cấp
// @Description Loại bỏ một dự án công trình khẩn cấp ra khỏi hệ thống theo ID
// @Tags Công trình khẩn cấp
// @Security BearerAuth
// @Param id path string true "ID dự án"
// @Success 200 {boolean} bool
// @Failure 401 {object} web.ErrorResponse
// @Router /admin/emergency-constructions/{id} [delete]
func (h *EmergencyConstructionHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	err := h.service.Delete(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, nil)
}

// GetByID godoc
// @Summary Lấy thông tin công trình khẩn cấp theo ID
// @Description Truy xuất thông tin chi tiết của một dự án công trình khẩn cấp cụ thể
// @Tags Công trình khẩn cấp
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID dự án"
// @Success 200 {object} web.Response{data=models.EmergencyConstruction}
// @Router /admin/emergency-constructions/{id} [get]
func (h *EmergencyConstructionHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	item, err := h.service.GetByID(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, item)
}

// List godoc
// @Summary Danh sách các dự án công trình khẩn cấp
// @Description Truy xuất danh sách các dự án công trình khẩn cấp với các bộ lọc
// @Tags Công trình khẩn cấp
// @Produce json
// @Security BearerAuth
// @Param org_id query string false "Lọc theo đơn vị"
// @Param search query string false "Tìm kiếm theo tên"
// @Param page query int false "Số trang"
// @Param size query int false "Số bản ghi mỗi trang"
// @Success 200 {object} web.Response{data=object{data=[]models.EmergencyConstruction,total=int}}
// @Router /admin/emergency-constructions [get]
func (h *EmergencyConstructionHandler) List(c *gin.Context) {
	req := filters.NewEmergencyConstructionListRequest()
	if err := c.ShouldBindQuery(req); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	// Permission-based filtering
	_, isAllowedAll, client := h.checkPermissions(c)
	if client == nil {
		return
	}

	queryOrgID := c.Query("org_id")
	targetOrgID := ""

	if isAllowedAll {
		targetOrgID = queryOrgID
	} else {
		targetOrgID = client.OrgID
	}
	req.OrgID = targetOrgID

	// 2. Further restrict by specific IDs if needed (Shared points or Employee assignments)
	if targetOrgID != "" {
		// UNION logic: Owned by Org OR in SharedOrgIDs list
		req.AddWhere("org_id_or_shared", "$or", []bson.M{
			{"org_id": targetOrgID},
			{"shared_org_ids": targetOrgID},
		})
		req.OrgID = "" // Clear the strict OrgID filter
	} else if client.IsEmployee {
		// Default mobile app view for employees: only their assigned items
		user, err := h.service.GetUserByID(c.Request.Context(), client.UserID)
		if err == nil && user != nil {
			if len(user.AssignedEmergencyConstructionIDs) > 0 {
				req.AddWhere("id", "_id", bson.M{"$in": user.AssignedEmergencyConstructionIDs})
			} else {
				// Empty result if nothing assigned
				h.SendData(c, gin.H{
					"data":  []interface{}{},
					"total": 0,
				})
				return
			}
		}
	}

	items, total, err := h.service.List(c.Request.Context(), req)
	web.AssertNil(err)

	h.SendData(c, gin.H{
		"data":  items,
		"total": total,
	})
}

// ListHistory godoc
// @Summary Danh sách lịch sử cập nhật công việc
// @Description Truy xuất lịch sử toàn bộ các cập nhật tiến độ cho các dự án
// @Tags Công trình khẩn cấp
// @Produce json
// @Security BearerAuth
// @Success 200 {object} web.Response{data=object{data=[]models.EmergencyConstructionProgress,total=int}}
// @Router /admin/emergency-constructions/history [get]
func (h *EmergencyConstructionHandler) ListHistory(c *gin.Context) {
	req := filters.NewEmergencyConstructionListRequest() // Use same for pagination
	if err := c.ShouldBindQuery(req); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	// Security isolation
	_, isAllowedAll, client := h.checkPermissions(c)
	if client == nil {
		return
	}

	if !isAllowedAll {
		req.OrgID = client.OrgID
	}

	if client.IsEmployee {
		user, err := h.service.GetUserByID(c.Request.Context(), client.UserID)
		if err == nil && user != nil {
			if len(user.AssignedEmergencyConstructionIDs) > 0 {
				req.AddWhere("construction_id", "construction_id", bson.M{"$in": user.AssignedEmergencyConstructionIDs})
			} else {
				h.SendData(c, gin.H{
					"data":  []interface{}{},
					"total": 0,
				})
				return
			}
		}
	}

	req.SetOrderBy("-report_date")

	items, total, err := h.service.ListHistory(c.Request.Context(), req)
	web.AssertNil(err)
	h.SendData(c, gin.H{
		"data":  items,
		"total": total,
	})
}

// GetHistory godoc
// @Summary Lấy thông tin chi tiết một bản cập nhật
// @Description Truy xuất thông tin chi tiết của một bản ghi cập nhật tiến độ duy nhất
// @Tags Công trình khẩn cấp
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID bản ghi lịch sử"
// @Success 200 {object} web.Response{data=models.EmergencyConstructionProgress}
// @Router /admin/emergency-constructions/history/{id} [get]
func (h *EmergencyConstructionHandler) GetHistory(c *gin.Context) {
	id := c.Param("id")
	history, err := h.service.GetHistory(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, history)
}

// GetProgressByID godoc
// @Summary Lấy thông tin tiến độ dự án
// @Description Truy xuất trạng thái tiến độ hiện tại của một dự án cụ thể
// @Tags Công trình khẩn cấp
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID dự án"
// @Success 200 {object} web.Response{data=models.EmergencyConstructionProgress}
// @Router /admin/emergency-constructions/{id}/progress [get]
func (h *EmergencyConstructionHandler) GetProgressByID(c *gin.Context) {
	client := h.GetTokenFromContext(c)
	if client.IsEmployee {
		web.AssertNil(web.Forbidden("Bạn không có quyền xem chi tiết báo cáo này"))
		return
	}

	id := c.Param("id")
	progress, err := h.service.GetProgressByID(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, progress)
}

// ReportProgress godoc
// @Summary Báo cáo tiến độ thi công công trình
// @Description Gửi một báo cáo tiến độ mới cho dự án công trình khẩn cấp, có hỗ trợ hình ảnh
// @Tags Công trình khẩn cấp
// @Accept multipart/form-data
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param construction_id formData string true "ID dự án"
// @Param work_done formData string true "Khối lượng công việc đã thực hiện"
// @Param images formData file false "Hình ảnh tiến độ"
// @Param progress_percentage formData int false "Phần trăm tiến độ (%)"
// @Success 200 {object} web.Response{data=models.EmergencyConstructionProgress}
// @Router /admin/emergency-constructions/report [post]
func (h *EmergencyConstructionHandler) ReportProgress(c *gin.Context) {
	// Security: check if employee is assigned to this construction
	client := h.GetTokenFromContext(c)
	if client.IsEmployee {
		constructionID := c.PostForm("construction_id")
		user, err := h.service.GetUserByID(c.Request.Context(), client.UserID)
		if err == nil && user != nil {
			isAssigned := false
			for _, cid := range user.AssignedEmergencyConstructionIDs {
				if cid == constructionID {
					isAssigned = true
					break
				}
			}
			if !isAssigned {
				web.AssertNil(web.Forbidden("Bạn không có quyền báo cáo cho công trình này"))
				return
			}
		}
	}
	h.handleProgress(c, "")
}

// UpdateProgress godoc
// @Summary Cập nhật bản báo cáo tiến độ
// @Description Cập nhật một bản ghi báo cáo tiến độ đã tồn tại
// @Tags Công trình khẩn cấp
// @Accept multipart/form-data
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID báo cáo tiến độ"
// @Param work_done formData string true "Nội dung công việc cập nhật"
// @Success 200 {object} web.Response{data=models.EmergencyConstructionProgress}
// @Router /admin/emergency-constructions/progress/{id} [put]
func (h *EmergencyConstructionHandler) UpdateProgress(c *gin.Context) {
	client := h.GetTokenFromContext(c)
	if client.IsEmployee {
		web.AssertNil(web.Forbidden("Bạn không có quyền chỉnh sửa báo cáo này"))
		return
	}

	id := c.Param("id")
	h.handleProgress(c, id)
}

func (h *EmergencyConstructionHandler) handleProgress(c *gin.Context, id string) {
	var item models.EmergencyConstructionProgress
	var images []emergency_construction.ImageContent

	contentType := c.GetHeader("Content-Type")
	isMultipart := len(contentType) >= 19 && contentType[:19] == "multipart/form-data"

	if isMultipart {
		form, err := c.MultipartForm()
		if err != nil {
			web.AssertNil(web.BadRequest(err.Error()))
			return
		}

		item.ConstructionID = c.PostForm("construction_id")
		item.WorkDone = c.PostForm("work_done")
		item.Issues = c.PostForm("issues")
		item.Order = c.PostForm("order")
		item.Location = c.PostForm("location")
		item.Conclusion = c.PostForm("conclusion")
		item.Influence = c.PostForm("influence")
		item.Proposal = c.PostForm("proposal")

		if progressStr := c.PostForm("progress_percentage"); progressStr != "" {
			p, _ := strconv.Atoi(progressStr)
			item.ProgressPercentage = p
		}

		if expectedDateStr := c.PostForm("expected_completion_date"); expectedDateStr != "" {
			ed, _ := strconv.ParseInt(expectedDateStr, 10, 64)
			item.ExpectedCompletionDate = ed
		}

		if tasksStr := c.PostForm("tasks"); tasksStr != "" {
			_ = json.Unmarshal([]byte(tasksStr), &item.Tasks)
		}

		if existingImagesStr := c.PostForm("existing_images"); existingImagesStr != "" {
			_ = json.Unmarshal([]byte(existingImagesStr), &item.Images)
			fmt.Printf("DEBUG: Found %d existing images in update request\n", len(item.Images))
		}

		// Handle images
		files := form.File["images"]
		for _, fileHeader := range files {
			file, err := fileHeader.Open()
			if err != nil {
				continue
			}
			defer file.Close()
			images = append(images, emergency_construction.ImageContent{
				Name:     fileHeader.Filename,
				MimeType: fileHeader.Header.Get("Content-Type"),
				Reader:   file,
			})
		}
	} else {
		if err := c.ShouldBindJSON(&item); err != nil {
			web.AssertNil(web.BadRequest(err.Error()))
			return
		}
	}

	userID := h.GetTokenFromContext(c).UserID
	item.ReportedBy = userID

	var err error
	if id == "" {
		err = h.service.ReportProgress(c.Request.Context(), &item, images)
	} else {
		err = h.service.UpdateProgress(c.Request.Context(), id, &item, images)
	}

	web.AssertNil(err)
	h.SendData(c, item)
}

// GetProgressHistory godoc
// @Summary Lấy lịch sử dự án (bao gồm lưu vào chat AI)
// @Description Truy xuất toàn bộ báo cáo tiến độ của dự án và lưu hành động vào lịch sử chat AI
// @Tags Công trình khẩn cấp
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID dự án"
// @Success 200 {object} web.Response{data=[]models.EmergencyConstructionProgress}
// @Router /admin/emergency-constructions/{id}/history [get]
func (h *EmergencyConstructionHandler) GetProgressHistory(c *gin.Context) {
	id := c.Param("id")
	history, err := h.service.GetProgressHistory(c.Request.Context(), id)
	web.AssertNil(err)

	// Persist to chat history as an AI response (since this is a history lookup action)
	userID := h.GetTokenFromContext(c).UserID
	if h.aiChatLogRepo != nil && userID != "" {
		now := time.Now()
		// Save User Query (implicit when clicking "Xem lịch sử")
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: userID, Role: "user", Content: "Xem lịch sử thi công", ChatType: "support", Timestamp: now.Add(-1 * time.Second),
		})

		// Build formatted text similar to index.jsx
		historyText := "### Lịch sử thi công\n\n"
		if len(history) == 0 {
			historyText += "Chưa có báo cáo tiến độ nào cho công trình này."
		} else {
			for _, m := range history {
				date := time.Unix(m.ReportDate, 0).Format("15:04 02/01/2006")
				historyText += fmt.Sprintf("**Ngày:** %s\n", date)
				historyText += fmt.Sprintf("**Công việc:** %s\n", m.WorkDone)
				if m.ProgressPercentage > 0 {
					historyText += fmt.Sprintf("**Tiến độ:** %d%%\n", m.ProgressPercentage)
				}
				if m.Issues != "" {
					historyText += fmt.Sprintf("**Khó khăn/Vướng mắc:** %s\n", m.Issues)
				}
				if m.IsCompleted {
					historyText += "**Trạng thái:** ✅ Đã hoàn thành\n"
				} else if m.ExpectedCompletionDate > 0 {
					expDate := time.Unix(m.ExpectedCompletionDate, 0).Format("02/01/2006")
					historyText += fmt.Sprintf("**Dự kiến xong:** %s\n", expDate)
				}
				historyText += "---\n"
			}
		}

		// Save AI Response
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: userID, Role: "model", Content: historyText, ChatType: "support", Timestamp: now,
		})
	}

	h.SendData(c, history)
}

// ExportExcel godoc
// @Summary Xuất báo cáo trạng thái dự án ra Excel
// @Description Tạo và tải lên bản báo cáo Excel các công trình lên Google Drive
// @Tags Công trình khẩn cấp
// @Produce json
// @Security BearerAuth
// @Param date query string false "Ngày báo cáo (YYYY-MM-DD)"
// @Param org_id query string false "Lọc theo đơn vị"
// @Success 200 {object} web.Response{data=object{file_id=string,url=string}}
// @Router /admin/emergency-constructions/export [get]
func (h *EmergencyConstructionHandler) ExportExcel(c *gin.Context) {
	date := c.Query("date")
	orgID := c.Query("org_id")

	// Permission-based isolation
	_, isAllowedAll, client := h.checkPermissions(c)
	if client != nil {
		if !isAllowedAll {
			orgID = client.OrgID
		}
	} else {
		web.AssertNil(web.Unauthorized("vui lòng đăng nhập lại"))
		return
	}

	fileID, err := h.service.ExportExcelToDrive(c.Request.Context(), date, orgID)
	web.AssertNil(err)

	h.SendData(c, gin.H{
		"file_id": fileID,
		"url":     fmt.Sprintf("https://drive.google.com/file/d/%s/view", fileID),
	})
}
