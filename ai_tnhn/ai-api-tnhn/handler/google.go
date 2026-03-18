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
	h.GenerateQuickReportV3(c)
}


// GenerateQuickReportV3 is the version 3 that matches script.gs requirements (using 2D arrays for tables)
func (h *GoogleHandler) GenerateQuickReportV3(c *gin.Context) {
	if h.driveSvc == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Google Drive service is not initialized."})
		return
	}

	// 0. Setup Context and Time
	ctx := c.Request.Context()
	now := time.Now()
	dd := now.Format("02")
	mm := now.Format("01")
	yyyy := now.Format("2006")
	hh := now.Format("15h04")
	shortHour := now.Format("15h")

	h.log.GetLogger().Infof(">>> Generating report V3 for %s-%s-%s %s", dd, mm, yyyy, hh)

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

	// Map Stations
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

	// Prepare Data
	lakeDataRaw := [][]string{{"Tên Trạm", "Mực nước"}}
	riverDataRaw := [][]string{{"Tên Trạm", "Mực nước"}}
	phuongDataRaw := [][]string{{"Tên Phường", "Lượng mưa"}}
	xaDataRaw := [][]string{{"Tên Xã", "Lượng mưa"}}

	// Temporary slices for sorting
	type itemVal struct {
		name string
		val  float64
	}
	var lakes, rivers, phuongs, xas []itemVal

	for _, d := range waterResp.Content.Data {
		tid, _ := d["TramId"].(string)
		val, _ := d["ThuongLuu_HT"].(float64)
		loai, _ := d["Loai"].(float64)
		name := waterStations[tid]
		if name == "" {
			continue
		}
		if loai == 2 {
			lakes = append(lakes, itemVal{name, val})
		} else {
			rivers = append(rivers, itemVal{name, val})
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
		if strings.Contains(strings.ToLower(name), "xã") {
			xas = append(xas, itemVal{name, val})
		} else {
			phuongs = append(phuongs, itemVal{name, val})
		}
	}

	// Sort and transform to 2D
	sort.Slice(lakes, func(i, j int) bool { return lakes[i].val > lakes[j].val })
	sort.Slice(rivers, func(i, j int) bool { return rivers[i].val > rivers[j].val })
	sort.Slice(phuongs, func(i, j int) bool { return phuongs[i].val > phuongs[j].val })
	sort.Slice(xas, func(i, j int) bool { return xas[i].val > xas[j].val })

	limit := func(vals []itemVal, n int) []itemVal {
		if len(vals) > n {
			return vals[:n]
		}
		return vals
	}

	for _, v := range limit(lakes, 5) {
		lakeDataRaw = append(lakeDataRaw, []string{v.name, fmt.Sprintf("%.2fm", v.val/100.0)})
	}
	for _, v := range limit(rivers, 5) {
		riverDataRaw = append(riverDataRaw, []string{v.name, fmt.Sprintf("%.2fm", v.val/100.0)})
	}
	for _, v := range limit(phuongs, 10) {
		phuongDataRaw = append(phuongDataRaw, []string{v.name, fmt.Sprintf("%.1f", v.val)})
	}
	for _, v := range limit(xas, 10) {
		xaDataRaw = append(xaDataRaw, []string{v.name, fmt.Sprintf("%.1f", v.val)})
	}

	// Calculate rain timing
	timeMua := ""
	var minStart, maxEnd time.Time
	parseT := func(s interface{}) time.Time {
		if s == nil {
			return time.Time{}
		}
		sStr := fmt.Sprintf("%v", s)
		layouts := []string{"02/01/2006 15:04:05", "02/01/2006 15:04", "2006-01-02 15:04:05", "2006-01-02 15:04", time.RFC3339}
		for _, layout := range layouts {
			t, err := time.ParseInLocation(layout, sStr, time.Local)
			if err == nil {
				return t
			}
		}
		return time.Time{}
	}

	for _, d := range rainResp.Content.Data {
		lmht, _ := d["LuongMua_HT"].(float64)
		if lmht > 0 {
			tbd := parseT(d["ThoiGian_BD"])
			tht := parseT(d["ThoiGian_HT"])
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

	// Content Generation
	extractedContent := ""
	if h.emailSvc != nil {
		content, err := h.emailSvc.GetLatestEmailAttachmentPage1(ctx)
		if err == nil && content != "" {
			extractedContent = content
		}
	}

	rainyPoints := len(phuongs) + len(xas)
	noidung := "Báo cáo tình hình mưa"
	if h.geminiSvc != nil && extractedContent != "" {
		prompt := fmt.Sprintf(`hãy phân tích và viết nội dung báo cáo phù hợp dựa trên: số điểm đang có mưa (%d), và nội dung trích xuất từ email dự báo/cảnh báo: [%s]. Tuân thủ quy tắc: Nếu < 5 điểm: "Mưa vùng", 5-10: "Mưa rải rác trên diện rộng", > 10: "Mưa trên diện rộng". Kết hợp với nguyên nhân từ email để viết thành câu hoàn chỉnh.`, rainyPoints, extractedContent)
		aiResult, err := h.geminiSvc.Chat(ctx, prompt, nil, "system_report")
		if err == nil && aiResult != "" {
			noidung = aiResult
		}
	}

	// 1.5 Fetch Inundation Data
	soLuongUngNgap := 0
	chiTietCacDiem := ""
	if inundationSummary, err := h.googleSvc.GetInundationSummary(ctx); err == nil && inundationSummary != nil {
		soLuongUngNgap = inundationSummary.ActivePoints
		if soLuongUngNgap > 0 {
			var details []string
			for _, pt := range inundationSummary.OngoingPoints {
				depthInfo := pt.Depth
				if depthInfo == "" {
					depthInfo = "chưa rõ độ sâu"
				} else {
					depthInfo = "ngập " + depthInfo
				}
				details = append(details, fmt.Sprintf("%s (%s)", pt.StreetName, depthInfo))
			}
			chiTietCacDiem = strings.Join(details, ", ")
		}
	} else if err != nil {
		h.log.GetLogger().Warnf("Failed to fetch inundation data: %v", err)
	}

	// Construct Payload matching script.gs
	payload := map[string]interface{}{
		"dd":                dd,
		"mm":                mm,
		"yyyy":              yyyy,
		"hh":                hh,
		"noidung":           noidung,
		"time_mua":          timeMua,
		"so_luong_ung_ngap": soLuongUngNgap,
		"chi_tiet_cac_diem": chiTietCacDiem,
		"table_mua_phuong":  phuongDataRaw,
		"table_mua_xa":      xaDataRaw,
		"table_song_ho": map[string]interface{}{
			"river": riverDataRaw,
			"lake":  lakeDataRaw,
		},
	}

	// Upload Template
	targetFilename := fmt.Sprintf("Báo cáo mưa ngày %s-%s-%s thời điểm %s.docx", dd, mm, yyyy, shortHour)
	localTemplate := filepath.Join("doc", "Báo cáo mưa ngày {dd}-{mm}-{yyyy} thời điểm {hh}.docx")
	fileData, err := os.Open(localTemplate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Template document not found: " + err.Error()})
		return
	}
	defer fileData.Close()

	reportsFolderID, err := h.driveSvc.FindOrCreateFolder(ctx, h.config.RootFolderID, "REPORTS")
	if err != nil {
		reportsFolderID = h.config.RootFolderID
	}

	templateFileID, err := h.driveSvc.UploadFile(ctx, reportsFolderID, targetFilename, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", fileData, true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload template: " + err.Error()})
		return
	}

	// Trigger Apps Script
	h.log.GetLogger().Infof(">>> Triggering report generation V3 with Webhook: %s", h.config.AppsScriptWebhookURL)
	reportResp, err := h.driveSvc.TriggerReportGeneration(ctx, h.config.AppsScriptWebhookURL, templateFileID, reportsFolderID, payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to trigger Apps Script: " + err.Error()})
		return
	}

	resLink := h.extractReportLink(reportResp)
	if resLink == "" {
		resLink = fmt.Sprintf("https://docs.google.com/document/d/%s/edit", templateFileID)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Report generation triggered successfully",
		"data": gin.H{
			"result":      reportResp,
			"report_url":  resLink,
			"report_link": resLink,
			"docID":       templateFileID,
		},
	})
}

func (h *GoogleHandler) extractReportLink(resp string) string {
	var data map[string]interface{}
	if err := json.Unmarshal([]byte(resp), &data); err == nil {
		// 1. Check top level keys
		keys := []string{"newDocId", "docID", "docId", "file_id", "fileId"}
		for _, key := range keys {
			if val, ok := data[key].(string); ok && val != "" {
				return fmt.Sprintf("https://docs.google.com/document/d/%s/edit", val)
			}
		}

		// 2. Check nested 'data' object (my recent Apps Script change)
		if nested, ok := data["data"].(map[string]interface{}); ok {
			for _, key := range keys {
				if val, ok := nested[key].(string); ok && val != "" {
					return fmt.Sprintf("https://docs.google.com/document/d/%s/edit", val)
				}
			}
			// Check urls in nested data
			urlKeys := []string{"report_url", "file_url", "report_link", "fileUrl"}
			for _, key := range urlKeys {
				if val, ok := nested[key].(string); ok && val != "" {
					return val
				}
			}
		}

		// 3. Check top level URL keys
		urlKeys := []string{"report_url", "file_url", "fileUrl", "report_link"}
		for _, key := range urlKeys {
			if val, ok := data[key].(string); ok && val != "" {
				return val
			}
		}
	}
	return ""
}
