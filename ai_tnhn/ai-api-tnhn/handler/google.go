package handler

import (
	"ai-api-tnhn/config"
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/service/email"
	"ai-api-tnhn/internal/service/gemini"
	"ai-api-tnhn/internal/service/googleapi"
	"ai-api-tnhn/internal/service/googledrive"
	"ai-api-tnhn/internal/service/water"
	"ai-api-tnhn/utils/web"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-resty/resty/v2"
)

type GoogleHandler struct {
	googleSvc   googleapi.Service
	geminiSvc   gemini.Service
	driveSvc    googledrive.Service
	waterSvc    water.Service
	emailSvc    email.Service
	contextWith web.ContextWith
	config      config.GoogleDriveConfig
	log         logger.Logger
}

func NewGoogleHandler(googleSvc googleapi.Service, geminiSvc gemini.Service, driveSvc googledrive.Service, waterSvc water.Service, emailSvc email.Service, contextWith web.ContextWith, conf config.GoogleDriveConfig, log logger.Logger) *GoogleHandler {
	return &GoogleHandler{
		googleSvc:   googleSvc,
		geminiSvc:   geminiSvc,
		driveSvc:    driveSvc,
		waterSvc:    waterSvc,
		emailSvc:    emailSvc,
		contextWith: contextWith,
		config:      conf,
		log:         log,
	}
}

func (h *GoogleHandler) GetStatus(c *gin.Context) {
	status, err := h.googleSvc.GetStatus(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   status,
	})
}

func (h *GoogleHandler) GetRainSummary(c *gin.Context) {
	summary, err := h.googleSvc.GetRainSummary(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   summary,
	})
}

func (h *GoogleHandler) GetWaterSummary(c *gin.Context) {
	summary, err := h.googleSvc.GetWaterSummary(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   summary,
	})
}

func (h *GoogleHandler) GetInundationSummary(c *gin.Context) {
	summary, err := h.googleSvc.GetInundationSummary(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   summary,
	})
}

func (h *GoogleHandler) Chat(c *gin.Context) {
	if h.geminiSvc == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Gemini AI service is not initialized. Please check GEMINI_API_KEY."})
		return
	}

	var body struct {
		Prompt  string               `json:"prompt"`
		History []gemini.ChatMessage `json:"history"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "prompt is required"})
		return
	}

	userID, _ := h.contextWith.GetUserID(c)
	response, err := h.geminiSvc.Chat(c.Request.Context(), body.Prompt, body.History, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   response,
	})
}

func (h *GoogleHandler) GetEmailDetail(c *gin.Context) {
	idStr := c.Param("id")
	var id uint32
	_, err := fmt.Sscanf(idStr, "%d", &id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID email không hợp lệ"})
		return
	}

	detail, err := h.googleSvc.ReadEmailByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   detail,
	})
}

func (h *GoogleHandler) GetRecentEmails(c *gin.Context) {
	emails, err := h.googleSvc.GetRecentEmails(c.Request.Context(), 10)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   emails,
	})
}

func (h *GoogleHandler) GetUnreadEmails(c *gin.Context) {
	emails, err := h.googleSvc.GetUnreadEmails(c.Request.Context(), 10)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   emails,
	})
}

// GenerateQuickReport handles the request to generate a quick report via Apps Script
func (h *GoogleHandler) GenerateQuickReport(c *gin.Context) {
	if h.driveSvc == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Google Drive service is not initialized."})
		return
	}

	// 0. Setup Context and Time
	ctx := c.Request.Context()
	now := time.Now()
	day := now.Format("02")
	month := now.Format("01")
	year := now.Format("2006")
	hourFull := now.Format("15h04")
	hourSimple := now.Format("15h")

	h.log.GetLogger().Infof(">>> Generating report for %s-%s-%s %s", day, month, year, hourFull)

	// 1. Fetch Water Data (Lakes and Rivers)
	waterURL := "https://noibo.thoatnuochanoi.vn/api/thuytri/getallmucnuoc?id=3a1a672f-c56f-4752-b86c-455e30427b87"
	rainURL := "https://noibo.thoatnuochanoi.vn/api/thuytri/getallrain?id=3a1a672f-c56f-4752-b86c-455e30427b87"

	client := resty.New()
	var waterResp, rainResp struct {
		Content struct {
			Tram []map[string]interface{} `json:"tram"`
			Data []map[string]interface{} `json:"data"`
		} `json:"Content"`
	}

	wResp, err := client.R().SetResult(&waterResp).Get(waterURL)
	if err != nil || wResp.IsError() {
		h.log.GetLogger().Warnf("Failed to fetch water data: %v, status: %d", err, wResp.StatusCode())
	}

	rResp, err := client.R().SetResult(&rainResp).Get(rainURL)
	if err != nil || rResp.IsError() {
		h.log.GetLogger().Warnf("Failed to fetch rain data: %v, status: %d", err, rResp.StatusCode())
	}
	h.log.GetLogger().Infof(" [QuickReport] Rain API Response: %d bytes, status: %d", len(rResp.Body()), rResp.StatusCode())

	// Map Stations for lookup
	waterStations := make(map[string]string)
	for _, t := range waterResp.Content.Tram {
		id, _ := t["Id"].(string)
		name, _ := t["TenTram"].(string)
		waterStations[id] = name
	}
	rainStations := make(map[string]string)
	for _, t := range rainResp.Content.Tram {
		var idStr string
		if id, ok := t["Id"].(float64); ok {
			idStr = fmt.Sprintf("%.0f", id)
		} else if id, ok := t["Id"].(string); ok {
			idStr = id
		}
		name, _ := t["TenPhuong"].(string)
		if name == "" {
			name, _ = t["TenTram"].(string)
		}
		rainStations[idStr] = name
	}

	// Prepare Payload slices
	lakeData := []map[string]string{}
	riverData := []map[string]string{}
	rainData := []map[string]string{}

	for _, d := range waterResp.Content.Data {
		tid, _ := d["TramId"].(string)
		val, _ := d["ThuongLuu_HT"].(float64)
		loai, _ := d["Loai"].(float64)
		name := waterStations[tid]
		if name == "" {
			continue
		}

		item := map[string]string{
			"tram":    name,
			"mucnuoc": fmt.Sprintf("%.2fm", val/100.0),
		}

		if loai == 2 {
			lakeData = append(lakeData, item)
		} else {
			riverData = append(riverData, item)
		}
	}

	for _, d := range rainResp.Content.Data {
		var tidStr string
		if tid, ok := d["TramId"].(float64); ok {
			tidStr = fmt.Sprintf("%.0f", tid)
		} else if tid, ok := d["TramId"].(string); ok {
			tidStr = tid
		}
		val, _ := d["LuongMua_HT"].(float64)
		name := rainStations[tidStr]
		if name == "" {
			continue
		}
		rainData = append(rainData, map[string]string{
			"name":  name,
			"value": fmt.Sprintf("%.1f", val),
		})
	}

	h.log.GetLogger().Infof(" [QuickReport] Live Rain Data: %d stations found", len(rainData))
	if len(rainData) > 0 {
		h.log.GetLogger().Infof(" [QuickReport] First station: %v = %s mm", rainData[0]["name"], rainData[0]["value"])
	}

	// 1.5 Fetch Rain Warning from Email
	warningText := "Không có cảnh báo mưa mới nhất."
	if h.emailSvc != nil {
		h.log.GetLogger().Info(">>> Fetching latest rain warning from email...")
		warning, err := h.emailSvc.GetLatestRainWarning(ctx)
		if err != nil {
			h.log.GetLogger().Warnf("Failed to fetch rain warning: %v", err)
		} else if warning != "" {
			warningText = warning
		}
	}

	// 2. Construct Payload
	payload := map[string]interface{}{
		"day":          day,
		"month":        month,
		"year":         year,
		"hour":         hourFull,
		"rainData":     rainData,
		"riverData":    riverData,
		"lakeData":     lakeData,
		"warning_rain": warningText,
	}

	// 3. Upload Template and naming
	targetFilename := fmt.Sprintf("Báo cáo mưa ngày %s-%s-%s thời điểm %s.docx", day, month, year, hourSimple)
	localTemplate := filepath.Join("doc", "Báo cáo mưa ngày {dd}-{mm}-{yyyy} thời điểm {hh}.docx")
	fileData, err := os.Open(localTemplate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Template document not found locally: " + err.Error()})
		return
	}
	defer fileData.Close()

	reportsFolderID, err := h.driveSvc.FindOrCreateFolder(ctx, h.config.RootFolderID, "REPORTS")
	if err != nil {
		h.log.GetLogger().Warnf("Failed to find or create REPORTS folder, using root: %v", err)
		reportsFolderID = h.config.RootFolderID
	}

	templateFileID, err := h.driveSvc.UploadFile(ctx, reportsFolderID, targetFilename, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", fileData, true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload template to Drive: " + err.Error()})
		return
	}

	// 4. Trigger Apps Script
	if h.config.AppsScriptWebhookURL == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Apps Script Webhook URL is not configured."})
		return
	}

	reportResp, err := h.driveSvc.TriggerReportGeneration(ctx, h.config.AppsScriptWebhookURL, templateFileID, reportsFolderID, payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to trigger Apps Script: " + err.Error()})
		return
	}

	// reportResp is usually a JSON string from Apps Script
	resLink := h.extractReportLink(reportResp)
	if resLink == "" {
		// Fallback to direct Drive link of the uploaded/converted document
		resLink = fmt.Sprintf("https://docs.google.com/document/d/%s/edit", templateFileID)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Report generation triggered successfully",
		"data": gin.H{
			"result":      reportResp,
			"report_url":  resLink,
			"report_link": resLink, // keep as fallback
			"docID":       templateFileID,
		},
	})
}

func (h *GoogleHandler) extractReportLink(resp string) string {
	var data map[string]interface{}
	if err := json.Unmarshal([]byte(resp), &data); err == nil {
		// Prioritize constructing standard EDIT link from IDs if available
		if docID, ok := data["newDocId"].(string); ok && docID != "" {
			return fmt.Sprintf("https://docs.google.com/document/d/%s/edit", docID)
		}
		if docID, ok := data["docID"].(string); ok && docID != "" {
			return fmt.Sprintf("https://docs.google.com/document/d/%s/edit", docID)
		}

		// Fallback to fileUrl or report_link provided by script
		if link, ok := data["fileUrl"].(string); ok && link != "" {
			return link
		}
		if link, ok := data["report_link"].(string); ok && link != "" {
			return link
		}
	}
	return ""
}
