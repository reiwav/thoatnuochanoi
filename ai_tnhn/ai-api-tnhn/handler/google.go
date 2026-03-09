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
	"sort"
	"strings"
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
	lakeDataRaw := []map[string]interface{}{}
	riverDataRaw := []map[string]interface{}{}
	phuongDataRaw := []map[string]interface{}{}
	xaDataRaw := []map[string]interface{}{}

	for _, d := range waterResp.Content.Data {
		tid, _ := d["TramId"].(string)
		val, _ := d["ThuongLuu_HT"].(float64)
		loai, _ := d["Loai"].(float64)
		name := waterStations[tid]
		if name == "" {
			continue
		}

		item := map[string]interface{}{
			"tram":    name,
			"mucnuoc": fmt.Sprintf("%.2fm", val/100.0),
			"val":     val,
		}

		if loai == 2 {
			lakeDataRaw = append(lakeDataRaw, item)
		} else {
			riverDataRaw = append(riverDataRaw, item)
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

		item := map[string]interface{}{
			"name":  name,
			"value": fmt.Sprintf("%.1f", val),
			"val":   val,
		}

		// Categorize based on name: default to Phường if not Xã
		if strings.Contains(name, "Xã") || strings.Contains(name, "xã") {
			xaDataRaw = append(xaDataRaw, item)
		} else {
			phuongDataRaw = append(phuongDataRaw, item)
		}
	}

	// Sort and Limit
	sort.Slice(lakeDataRaw, func(i, j int) bool {
		return lakeDataRaw[i]["val"].(float64) > lakeDataRaw[j]["val"].(float64)
	})
	if len(lakeDataRaw) > 5 {
		lakeDataRaw = lakeDataRaw[:5]
	}

	sort.Slice(riverDataRaw, func(i, j int) bool {
		return riverDataRaw[i]["val"].(float64) > riverDataRaw[j]["val"].(float64)
	})
	if len(riverDataRaw) > 5 {
		riverDataRaw = riverDataRaw[:5]
	}

	sort.Slice(phuongDataRaw, func(i, j int) bool {
		return phuongDataRaw[i]["val"].(float64) > phuongDataRaw[j]["val"].(float64)
	})
	if len(phuongDataRaw) > 10 {
		phuongDataRaw = phuongDataRaw[:10]
	}

	sort.Slice(xaDataRaw, func(i, j int) bool {
		return xaDataRaw[i]["val"].(float64) > xaDataRaw[j]["val"].(float64)
	})
	if len(xaDataRaw) > 10 {
		xaDataRaw = xaDataRaw[:10]
	}

	// Convert back to requested slices of maps
	lakeData := []map[string]string{}
	for _, item := range lakeDataRaw {
		lakeData = append(lakeData, map[string]string{
			"tram":    item["tram"].(string),
			"mucnuoc": item["mucnuoc"].(string),
		})
	}
	riverData := []map[string]string{}
	for _, item := range riverDataRaw {
		riverData = append(riverData, map[string]string{
			"tram":    item["tram"].(string),
			"mucnuoc": item["mucnuoc"].(string),
		})
	}
	phuongData := []map[string]string{}
	for _, item := range phuongDataRaw {
		phuongData = append(phuongData, map[string]string{
			"name":  item["name"].(string),
			"value": item["value"].(string),
		})
	}
	xaData := []map[string]string{}
	for _, item := range xaDataRaw {
		xaData = append(xaData, map[string]string{
			"name":  item["name"].(string),
			"value": item["value"].(string),
		})
	}

	h.log.GetLogger().Infof(" [QuickReport] Data stats: %d Phường (top 10), %d Xã (top 10), %d Lakes (top 5), %d Rivers (top 5)", len(phuongData), len(xaData), len(lakeData), len(riverData))

	// 1.4 Fetch latest email for noi_dung
	noiDung := "Báo cáo tình hình mưa" // Default
	if h.emailSvc != nil {
		emails, err := h.emailSvc.GetRecentEmails(ctx, 1)
		if err == nil && len(emails) > 0 {
			noiDung = emails[0].Subject
		}
	}

	// 1.5 Calculate time_mua
	timeMua := ""
	var minStart, maxEnd time.Time
	parseTime := func(s string) time.Time {
		if s == "" {
			return time.Time{}
		}
		layouts := []string{
			"02/01/2006 15:04:05",
			"02/01/2006 15:04",
			"2006-01-02 15:04:05",
			"2006-01-02 15:04",
			time.RFC3339,
			"2006-01-02T15:04:05",
		}
		for _, layout := range layouts {
			t, err := time.ParseInLocation(layout, s, time.Local)
			if err == nil {
				return t
			}
		}
		return time.Time{}
	}

	for _, d := range rainResp.Content.Data {
		lmht, _ := d["LuongMua_HT"].(float64)
		if lmht > 0 {
			tbdStr, _ := d["ThoiGian_BD"].(string)
			thtStr, _ := d["ThoiGian_HT"].(string)

			tbd := parseTime(tbdStr)
			tht := parseTime(thtStr)

			if !tbd.IsZero() && (minStart.IsZero() || tbd.Before(minStart)) {
				minStart = tbd
			}
			if !tht.IsZero() && (maxEnd.IsZero() || tht.After(maxEnd)) {
				maxEnd = tht
			}
		}
	}

	if !minStart.IsZero() && !maxEnd.IsZero() {
		timeMua = fmt.Sprintf("%s đến %s", minStart.Format("15h04'"), maxEnd.Format("15h04'"))
	}

	// 1.6 Fetch Rain Warning from Email
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
		"phuongData":   phuongData,
		"xaData":       xaData,
		"lakeData":     lakeData,
		"riverData":    riverData,
		"warning_rain": warningText,
		"noi_dung":     noiDung,
		"time_mua":     timeMua,
	}
	fmt.Println("==========================", timeMua)
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
