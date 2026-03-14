package handler

import (
	"ai-api-tnhn/handler/filters"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/emergency_construction"
	"ai-api-tnhn/utils/web"
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/gin-gonic/gin"
)

type EmergencyConstructionHandler struct {
	web.JsonRender
	web.ClientCache
	service emergency_construction.Service
}

func NewEmergencyConstructionHandler(service emergency_construction.Service) *EmergencyConstructionHandler {
	return &EmergencyConstructionHandler{
		service: service,
	}
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

	// Security isolation
	client := h.GetTokenFromContext(c)
	if client.Role != "super_admin" {
		req.OrgID = client.OrgId
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
	client := h.GetTokenFromContext(c)
	if client.Role != "super_admin" {
		req.OrgID = client.OrgId
	}

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
	if client.Role == "employee" {
		web.AssertNil(web.Forbidden("Bạn không có quyền xem chi tiết báo cáo này"))
		return
	}

	id := c.Param("id")
	progress, err := h.service.GetProgressByID(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, progress)
}

func (h *EmergencyConstructionHandler) ReportProgress(c *gin.Context) {
	h.handleProgress(c, "")
}

func (h *EmergencyConstructionHandler) UpdateProgress(c *gin.Context) {
	client := h.GetTokenFromContext(c)
	if client.Role == "employee" {
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
	h.SendData(c, history)
}
