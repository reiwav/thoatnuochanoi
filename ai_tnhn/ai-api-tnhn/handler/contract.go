package handler

import (
	"ai-api-tnhn/handler/filters"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/auth"
	"ai-api-tnhn/internal/service/contract"
	"ai-api-tnhn/utils/web"

	"github.com/gin-gonic/gin"
)

type ContractHandler struct {
	web.JsonRender
	service     contract.Service
	authService auth.Service
	contextWith web.ContextWith
}

func NewContractHandler(service contract.Service, authService auth.Service, contextWith web.ContextWith) *ContractHandler {
	return &ContractHandler{
		service:     service,
		authService: authService,
		contextWith: contextWith,
	}
}

func (h *ContractHandler) Create(c *gin.Context) {
	var item models.Contract
	if err := c.ShouldBindJSON(&item); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	item.OrgID = h.contextWith.GetTokenFromContext(c).OrgID

	err := h.service.Create(c.Request.Context(), &item)
	web.AssertNil(err)
	h.SendData(c, item)
}

func (h *ContractHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var item models.Contract
	if err := c.ShouldBindJSON(&item); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	err := h.service.Update(c.Request.Context(), id, &item)
	web.AssertNil(err)
	h.SendData(c, item)
}

func (h *ContractHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	err := h.service.Delete(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, nil)
}

func (h *ContractHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	item, err := h.service.GetByID(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, item)
}

func (h *ContractHandler) List(c *gin.Context) {
	req := filters.NewContractListRequest()
	if err := c.ShouldBindQuery(req); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	// Force OrgID from context
	orgID, err := h.contextWith.GetOrgID(c)
	if err == nil && orgID != "" && orgID != "all" {
		req.OrgID = orgID
	}

	items, total, err := h.service.List(c.Request.Context(), req)
	web.AssertNil(err)
	h.SendData(c, gin.H{
		"data":  items,
		"total": total,
	})
}

func (h *ContractHandler) Upload(c *gin.Context) {
	id := c.Param("id")
	file, err := c.FormFile("file")
	if err != nil {
		web.AssertNil(web.BadRequest("file is required"))
		return
	}

	f, err := file.Open()
	if err != nil {
		web.AssertNil(web.InternalServerError(err.Error()))
		return
	}
	defer f.Close()

	fileID, err := h.service.UploadFile(c.Request.Context(), id, file.Filename, file.Header.Get("Content-Type"), f)
	if err != nil {
		web.AssertNil(web.InternalServerError(err.Error()))
		return
	}

	h.SendData(c, gin.H{
		"file_id": fileID,
		"name":    file.Filename,
		"link":    "https://drive.google.com/open?id=" + fileID,
	})
}

func (h *ContractHandler) PrepareFolder(c *gin.Context) {
	var body struct {
		CategoryID string `json:"category_id"`
		Name       string `json:"name"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		web.AssertNil(web.BadRequest(err.Error()))
		return
	}

	if body.CategoryID == "" {
		web.AssertNil(web.BadRequest("category_id is required"))
		return
	}

	orgID := h.contextWith.GetTokenFromContext(c).OrgID

	folderID, link, err := h.service.PrepareDriveFolder(c.Request.Context(), orgID, body.CategoryID, body.Name)
	web.AssertNil(err)

	h.SendData(c, gin.H{
		"drive_folder_id":   folderID,
		"drive_folder_link": link,
	})
}

func (h *ContractHandler) UploadToFolder(c *gin.Context) {
	folderID := c.Query("folder_id")
	if folderID == "" {
		web.AssertNil(web.BadRequest("folder_id is required"))
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		web.AssertNil(web.BadRequest("file is required"))
		return
	}

	f, err := file.Open()
	if err != nil {
		web.AssertNil(web.InternalServerError(err.Error()))
		return
	}
	defer f.Close()

	fileID, err := h.service.UploadToFolder(c.Request.Context(), folderID, file.Filename, file.Header.Get("Content-Type"), f)
	if err != nil {
		h.SendError(c, web.InternalServerError(err.Error()))
		return
	}

	h.SendData(c, gin.H{
		"file_id": fileID,
		"name":    file.Filename,
		"link":    "https://drive.google.com/open?id=" + fileID,
	})
}

func (h *ContractHandler) DeleteFile(c *gin.Context) {
	fileID := c.Query("file_id")
	if fileID == "" {
		h.SendError(c, web.BadRequest("file_id is required"))
		return
	}

	err := h.service.DeleteDriveFile(c.Request.Context(), fileID)
	if err != nil {
		h.SendError(c, web.InternalServerError(err.Error()))
		return
	}

	h.Success(c)
}
