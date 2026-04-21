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

// Create godoc
// @Summary Tạo mới một hợp đồng
// @Description Tạo mới một hợp đồng với thông tin cơ bản
// @Tags Hợp đồng
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param contract body models.Contract true "Dữ liệu hợp đóng"
// @Success 200 {object} web.Response{data=models.Contract}
// @Failure 401 {object} web.ErrorResponse
// @Router /contracts [post]
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

// Update godoc
// @Summary Cập nhật hợp đồng
// @Description Cập nhật thông tin chi tiết của một hợp đồng hiện có
// @Tags Hợp đồng
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID hợp đồng"
// @Param contract body models.Contract true "Dữ liệu hợp đồng cập nhật"
// @Success 200 {object} web.Response{data=models.Contract}
// @Failure 401 {object} web.ErrorResponse
// @Router /contracts/{id} [put]
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

// Delete godoc
// @Summary Xóa hợp đồng
// @Description Loại bỏ một hợp đồng khỏi hệ thống theo ID
// @Tags Hợp đồng
// @Security BearerAuth
// @Param id path string true "ID hợp đồng"
// @Success 200 {boolean} bool
// @Failure 401 {object} web.ErrorResponse
// @Router /contracts/{id} [delete]
func (h *ContractHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	err := h.service.Delete(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, nil)
}

// GetByID godoc
// @Summary Lấy thông tin hợp đồng theo ID
// @Description Truy xuất thông tin chi tiết của một hợp đồng cụ thể
// @Tags Hợp đồng
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID hợp đồng"
// @Success 200 {object} web.Response{data=models.Contract}
// @Router /contracts/{id} [get]
func (h *ContractHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	item, err := h.service.GetByID(c.Request.Context(), id)
	web.AssertNil(err)
	h.SendData(c, item)
}

// List godoc
// @Summary Danh sách hợp đồng
// @Description Truy xuất danh sách các hợp đồng với tính năng lọc và phân trang
// @Tags Hợp đồng
// @Produce json
// @Security BearerAuth
// @Param search query string false "Tìm kiếm theo mã hoặc tên"
// @Param category_id query string false "Lọc theo danh mục"
// @Param org_id query string false "Lọc theo đơn vị quản lý"
// @Param page query int false "Số trang"
// @Param size query int false "Số bản ghi mỗi trang"
// @Success 200 {object} web.Response{data=object{data=[]models.Contract,total=int}}
// @Router /contracts [get]
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

// Upload godoc
// @Summary Tải lên tài liệu cho hợp đồng
// @Description Tải một tệp tin liên quan đến hợp đồng lên Google Drive
// @Tags Hợp đồng
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID hợp đồng"
// @Param file formData file true "Tệp tin tải lên"
// @Success 200 {object} web.Response{data=object{file_id=string,name=string,link=string}}
// @Router /contracts/{id}/upload [post]
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

// PrepareFolder godoc
// @Summary Chuẩn bị thư mục Drive cho hợp đồng
// @Description Tạo một thư mục riêng trên Google Drive cho danh mục hợp đồng
// @Tags Hợp đồng
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body object{category_id=string,name=string} true "Thông tin thư mục"
// @Success 200 {object} web.Response{data=object{drive_folder_id=string,drive_folder_link=string}}
// @Router /contracts/prepare-folder [post]
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

// UploadToFolder godoc
// @Summary Tải lên tệp vào thư mục cụ thể
// @Description Tải trực tiếp một tệp tin lên một thư mục Google Drive đã chỉ định
// @Tags Hợp đồng
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param folder_id query string true "ID thư mục Drive"
// @Param file formData file true "Tệp tin tải lên"
// @Success 200 {object} web.Response{data=object{file_id=string,name=string,link=string}}
// @Router /contracts/upload-to-folder [post]
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

// DeleteFile godoc
// @Summary Xóa tệp khỏi Drive
// @Description Loại bỏ một tệp tin khỏi Google Drive
// @Tags Hợp đồng
// @Security BearerAuth
// @Param file_id query string true "ID tệp tin Drive"
// @Success 200 {boolean} bool
// @Router /contracts/delete-file [delete]
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
