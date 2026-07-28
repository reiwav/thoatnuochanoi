package google

import (
	"ai-api-tnhn/config"
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/google/email"
	"ai-api-tnhn/internal/service/google/gemini"
	"ai-api-tnhn/internal/service/google/googleapi"
	"ai-api-tnhn/internal/service/google/googledrive"
	"ai-api-tnhn/internal/service/report"
	"ai-api-tnhn/internal/service/station/water"
	"ai-api-tnhn/internal/service/weather"
	"ai-api-tnhn/utils/web"
	"context"

	"github.com/gin-gonic/gin"
)

type Handler interface {
	GetWeatherForecast(c *gin.Context)
	GetGeminiWeatherForecast(c *gin.Context)
	GetRainSummary(c *gin.Context)
	GetRainSummaryText(c *gin.Context)
	GetWaterSummary(c *gin.Context)
	GetInundationSummary(c *gin.Context)
	ChatContract(c *gin.Context)
	Chat(c *gin.Context)
	GetChatHistory(c *gin.Context)
	GetEmailDetail(c *gin.Context)
	GetRecentEmails(c *gin.Context)
	GetUnreadEmails(c *gin.Context)
	GenerateQuickReport(c *gin.Context)
	GenerateQuickReportV3(c *gin.Context)
	GenerateQuickReportText(c *gin.Context)
	GenerateAIDynamicReport(c *gin.Context)
	GetStatus(c *gin.Context)
}

type handler struct {
	web.JsonRender
	googleSvc     googleapi.Service
	geminiSvc     gemini.Service
	driveSvc      googledrive.Service
	waterSvc      water.Service
	weatherSvc    weather.Service
	emailSvc      email.Service
	contextWith   web.ContextWith
	aiChatLogRepo repository.AiChatLog
	reportSvc     report.Service
	config        config.GoogleDriveConfig
	log           logger.Logger
}

func NewHandler(googleSvc googleapi.Service, geminiSvc gemini.Service, driveSvc googledrive.Service, waterSvc water.Service, emailSvc email.Service, contextWith web.ContextWith, conf config.GoogleDriveConfig, log logger.Logger, weatherSvc weather.Service, aiChatLogRepo repository.AiChatLog, reportSvc report.Service) Handler {
	h := &handler{
		googleSvc:     googleSvc,
		geminiSvc:     geminiSvc,
		driveSvc:      driveSvc,
		waterSvc:      waterSvc,
		emailSvc:      emailSvc,
		contextWith:   contextWith,
		aiChatLogRepo: aiChatLogRepo,
		config:        conf,
		log:           log,
		weatherSvc:    weatherSvc,
		reportSvc:     reportSvc,
	}

	// Chạy nền khi khởi động để nạp Cache đã được chuyển sang tầng bootstrap/service

	return h
}

func (h *handler) getLatestOCRText(ctx context.Context) string {
	return h.googleSvc.GetLatestOCRText(ctx)
}

// GetStatus godoc
// @Summary Lấy trạng thái tích hợp Google API
// @Description Kiểm tra trạng thái tích hợp các dịch vụ của Google
// @Tags Tiện ích
// @Produce json
// @Security BearerAuth
// @Success 200 {object} web.Response{data=object}
// @Router /admin/google/status [get]
func (h *handler) GetStatus(c *gin.Context) {
	status, err := h.googleSvc.GetStatus(c.Request.Context())
	web.AssertNil(err)
	h.SendData(c, status)
}
