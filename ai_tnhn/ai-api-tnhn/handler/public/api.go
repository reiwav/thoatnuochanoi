package public

import (
	"ai-api-tnhn/internal/dto"
	"ai-api-tnhn/internal/service/publicapi"
	"ai-api-tnhn/utils/web"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	web.JsonRender
	service publicapi.Service
}

func NewHandler(service publicapi.Service) *Handler {
	return &Handler{
		service: service,
	}
}



// GetMasterStations godoc
// @Summary Lấy danh sách trạm (Master Data)
// @Description Lấy danh sách toàn bộ các trạm để đồng bộ ID. Hỗ trợ filter theo loại trạm.
// @Tags Public API
// @Produce json
// @Param X-App-Id header string true "Mã định danh đối tác (ví dụ: cic_app)"
// @Param X-Timestamp header string true "Unix timestamp hiện tại"
// @Param X-Signature header string true "Chữ ký RSA điện tử mã hóa Base64"
// @Param type query string false "Loại trạm: lake, river, rain, inundation, sluice_gate, wastewater"
// @Success 200 {object} web.Response{data=[]dto.PublicStationMaster}
// @Router /public/v1/stations [get]
func (h *Handler) GetMasterStations(c *gin.Context) {
	stationType := c.Query("type")
	res, err := h.service.GetStationsMasterList(c.Request.Context(), stationType)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, res)
}

// GetLakeData godoc
// @Summary Lấy dữ liệu trạm hồ theo ID
// @Tags Public API
// @Produce json
// @Param X-App-Id header string true "Mã định danh đối tác"
// @Param X-Timestamp header string true "Unix timestamp"
// @Param X-Signature header string true "Chữ ký RSA"
// @Param id path string true "ID trạm"
// @Param date query int false "Unix timestamp lấy dữ liệu (giây)"
// @Success 200 {object} web.Response{data=[]dto.PublicWaterData}
// @Router /public/v1/water/lake/{id} [get]
func (h *Handler) GetLakeData(c *gin.Context) {
	id := c.Param("id")
	var query dto.PublicDateQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		h.SendError(c, err)
		return
	}
	res, err := h.service.GetPublicWaterData(c.Request.Context(), "lake", id, query.GetDate())
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, res)
}

// GetRiverData godoc
// @Summary Lấy dữ liệu trạm sông theo ID
// @Tags Public API
// @Produce json
// @Param X-App-Id header string true "Mã định danh đối tác"
// @Param X-Timestamp header string true "Unix timestamp"
// @Param X-Signature header string true "Chữ ký RSA"
// @Param id path string true "ID trạm"
// @Param date query int false "Unix timestamp lấy dữ liệu (giây)"
// @Success 200 {object} web.Response{data=[]dto.PublicWaterData}
// @Router /public/v1/water/river/{id} [get]
func (h *Handler) GetRiverData(c *gin.Context) {
	id := c.Param("id")
	var query dto.PublicDateQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		h.SendError(c, err)
		return
	}
	res, err := h.service.GetPublicWaterData(c.Request.Context(), "river", id, query.GetDate())
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, res)
}

// GetRainData godoc
// @Summary Lấy dữ liệu trạm mưa theo ID
// @Tags Public API
// @Produce json
// @Param X-App-Id header string true "Mã định danh đối tác"
// @Param X-Timestamp header string true "Unix timestamp"
// @Param X-Signature header string true "Chữ ký RSA"
// @Param id path string true "ID trạm"
// @Param date query int false "Unix timestamp lấy dữ liệu (giây)"
// @Success 200 {object} web.Response{data=[]dto.PublicRainData}
// @Router /public/v1/rain/{id} [get]
func (h *Handler) GetRainData(c *gin.Context) {
	id := c.Param("id")
	var query dto.PublicDateQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		h.SendError(c, err)
		return
	}
	res, err := h.service.GetPublicRainData(c.Request.Context(), id, query.GetDate())
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, res)
}

// GetInundationData godoc
// @Summary Lấy dữ liệu điểm ngập theo ID
// @Tags Public API
// @Produce json
// @Param X-App-Id header string true "Mã định danh đối tác"
// @Param X-Timestamp header string true "Unix timestamp"
// @Param X-Signature header string true "Chữ ký RSA"
// @Param id path string true "ID điểm ngập"
// @Param start_date query int false "Unix timestamp bắt đầu (giây), tối đa 1 năm"
// @Param end_date query int false "Unix timestamp kết thúc (giây)"
// @Success 200 {object} web.Response{data=[]dto.PublicInundationData}
// @Router /public/v1/inundation/{id} [get]
func (h *Handler) GetInundationData(c *gin.Context) {
	id := c.Param("id")
	var query dto.PublicDateRangeQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		h.SendError(c, err)
		return
	}
	startUnix, endUnix := query.GetRange()
	res, err := h.service.GetPublicInundationData(c.Request.Context(), id, startUnix, endUnix)
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, res)
}

// GetSluiceGateData godoc
// @Summary Lấy dữ liệu cửa phai theo ID
// @Tags Public API
// @Produce json
// @Param X-App-Id header string true "Mã định danh đối tác"
// @Param X-Timestamp header string true "Unix timestamp"
// @Param X-Signature header string true "Chữ ký RSA"
// @Param id path string true "ID cửa phai"
// @Param date query int false "Unix timestamp lấy dữ liệu (giây)"
// @Success 200 {object} web.Response{data=[]dto.PublicSluiceGateData}
// @Router /public/v1/sluice-gate/{id} [get]
func (h *Handler) GetSluiceGateData(c *gin.Context) {
	id := c.Param("id")
	var query dto.PublicDateQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		h.SendError(c, err)
		return
	}
	res, err := h.service.GetPublicSluiceGateData(c.Request.Context(), id, query.GetDate())
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, res)
}

// GetWastewaterData godoc
// @Summary Lấy dữ liệu trạm xử lý nước thải theo ID
// @Tags Public API
// @Produce json
// @Param X-App-Id header string true "Mã định danh đối tác"
// @Param X-Timestamp header string true "Unix timestamp"
// @Param X-Signature header string true "Chữ ký RSA"
// @Param id path string true "ID trạm XLNT"
// @Param date query int false "Unix timestamp lấy dữ liệu (giây)"
// @Success 200 {object} web.Response{data=[]dto.PublicWastewaterData}
// @Router /public/v1/wastewater/{id} [get]
func (h *Handler) GetWastewaterData(c *gin.Context) {
	id := c.Param("id")
	var query dto.PublicDateQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		h.SendError(c, err)
		return
	}
	res, err := h.service.GetPublicWastewaterData(c.Request.Context(), id, query.GetDate())
	if err != nil {
		h.SendError(c, err)
		return
	}
	h.SendData(c, res)
}
