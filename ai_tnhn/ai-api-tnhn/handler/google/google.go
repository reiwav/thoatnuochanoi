package google

import (
	"ai-api-tnhn/config"
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/email"
	"ai-api-tnhn/internal/service/gemini"
	"ai-api-tnhn/internal/service/googleapi"
	"ai-api-tnhn/internal/service/googledrive"
	"ai-api-tnhn/internal/service/water"
	"ai-api-tnhn/internal/service/weather"
	"ai-api-tnhn/internal/service/report"
	"ai-api-tnhn/utils/web"
	"context"
	"sync"

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
	cachedOCRText string
	cachedEmailID uint32
	ocrMu         sync.RWMutex
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

	// Chạy nền khi khởi động để nạp Cache
	go func() {
		h.log.GetLogger().Infof("Startup: Bat dau nap cache email OCR Text doc ngay...")
		h.getLatestOCRText(context.Background())
	}()

	return h
}

func (h *handler) getLatestOCRText(ctx context.Context) string {
	if h.emailSvc == nil || h.geminiSvc == nil {
		return ""
	}

	id, err := h.emailSvc.GetLatestWeatherEmailID(ctx)
	if err != nil {
		h.log.GetLogger().Warnf("Failed to get latest weather email ID: %v", err)
		return ""
	}

	h.ocrMu.RLock()
	if id <= h.cachedEmailID && h.cachedOCRText != "" {
		text := h.cachedOCRText
		h.ocrMu.RUnlock()
		h.log.GetLogger().Infof("DynamicReport: Using cached OCR text from email ID %d", id)
		return text
	}
	h.ocrMu.RUnlock()

	// Download and extract if new ID or cache empty
	h.log.GetLogger().Infof("DynamicReport: Fetching new OCR text for email ID %d", id)
	raw, _, err := h.emailSvc.GetEmailAttachmentRawByID(ctx, id)
	if err != nil || len(raw) == 0 {
		h.log.GetLogger().Warnf("Failed to fetch email raw attachment: %v", err)
		return ""
	}

	ocrText, geminiErr := h.geminiSvc.ExtractTextFromPDF(ctx, raw)
	if geminiErr == nil && ocrText != "" {
		h.ocrMu.Lock()
		h.cachedEmailID = id
		h.cachedOCRText = ocrText
		h.ocrMu.Unlock()
		h.log.GetLogger().Infof("DynamicReport: OCR OK, %d chars, cached with Email ID %d", len(ocrText), id)
		return ocrText
	} else if geminiErr != nil {
		h.log.GetLogger().Warnf("Gemini OCR failed: %v", geminiErr)
	}

	return ""
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
