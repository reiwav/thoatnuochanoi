package handler

import (
	"ai-api-tnhn/constant"
	"ai-api-tnhn/handler/filters"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/emergency_construction"
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

	isSuperAdmin = client.Role == constant.ROLE_SUPER_ADMIN ||
		client.Role == "supper_admin" ||
		client.Role == "supper_admib" ||
		client.Role == "super_admin "

	isAllowedAll = isSuperAdmin || client.IsCompany
	return isSuperAdmin, isAllowedAll, client
}

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

func (h *EmergencyConstructionHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	err := h.service.Delete(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, nil)
}

func (h *EmergencyConstructionHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	item, err := h.service.GetByID(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, item)
}

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
	} else if client.Role == constant.ROLE_EMPLOYEE || client.IsEmployee {
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

	if client.Role == constant.ROLE_EMPLOYEE || client.IsEmployee {
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

func (h *EmergencyConstructionHandler) GetHistory(c *gin.Context) {
	id := c.Param("id")
	history, err := h.service.GetHistory(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, history)
}

func (h *EmergencyConstructionHandler) GetProgressByID(c *gin.Context) {
	client := h.GetTokenFromContext(c)
	if client.Role == constant.ROLE_EMPLOYEE || client.IsEmployee {
		web.AssertNil(web.Forbidden("Bạn không có quyền xem chi tiết báo cáo này"))
		return
	}

	id := c.Param("id")
	progress, err := h.service.GetProgressByID(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, progress)
}

func (h *EmergencyConstructionHandler) ReportProgress(c *gin.Context) {
	// Security: check if employee is assigned to this construction
	client := h.GetTokenFromContext(c)
	if client.Role == constant.ROLE_EMPLOYEE || client.IsEmployee {
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

func (h *EmergencyConstructionHandler) UpdateProgress(c *gin.Context) {
	client := h.GetTokenFromContext(c)
	if client.Role == constant.ROLE_EMPLOYEE || client.IsEmployee {
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
