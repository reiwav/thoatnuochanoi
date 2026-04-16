package handler

import (
	"ai-api-tnhn/config"
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/email"
	"ai-api-tnhn/internal/service/gemini"
	"ai-api-tnhn/internal/service/googleapi"
	"ai-api-tnhn/internal/service/googledrive"
	"ai-api-tnhn/internal/service/water"

	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/weather"
	"ai-api-tnhn/utils/web"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/sync/errgroup"
)

type GoogleHandler struct {
	googleSvc     googleapi.Service
	geminiSvc     gemini.Service
	driveSvc      googledrive.Service
	waterSvc      water.Service
	weatherSvc    weather.Service
	emailSvc      email.Service
	contextWith   web.ContextWith
	aiChatLogRepo repository.AiChatLog
	config        config.GoogleDriveConfig
	log           logger.Logger
	cachedOCRText string
	cachedEmailID uint32
	ocrMu         sync.RWMutex
}

func NewGoogleHandler(googleSvc googleapi.Service, geminiSvc gemini.Service, driveSvc googledrive.Service, waterSvc water.Service, emailSvc email.Service, contextWith web.ContextWith, conf config.GoogleDriveConfig, log logger.Logger, weatherSvc weather.Service, aiChatLogRepo repository.AiChatLog) *GoogleHandler {
	h := &GoogleHandler{
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
	}

	// Chạy nền khi khởi động để nạp Cache
	go func() {
		h.log.GetLogger().Infof("Startup: Bat dau nap cache email OCR Text doc ngay...")
		h.getLatestOCRText(context.Background())
	}()

	return h
}

func (h *GoogleHandler) GetWeatherForecast(c *gin.Context) {
	forecast, err := h.weatherSvc.GetForecast(c.Request.Context())
	if err != nil {
		h.log.GetLogger().Errorf("Failed to get weather forecast: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể lấy thông tin dự báo thời tiết lúc này"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   forecast,
	})
}

func (h *GoogleHandler) GetGeminiWeatherForecast(c *gin.Context) {
	forecast, err := h.weatherSvc.GetGeminiForecast(c.Request.Context())
	if err != nil {
		h.log.GetLogger().Errorf("Failed to get gemini weather forecast: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể lấy thông tin dự báo thời tiết lúc này"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   forecast,
	})
}

func (h *GoogleHandler) getLatestOCRText(ctx context.Context) string {
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
	// Persist to chat history
	token := h.contextWith.GetTokenFromContext(c)
	orgID := token.OrgID
	if token.IsCompany {
		orgID = ""
	}
	summary, err := h.googleSvc.GetRainSummary(c.Request.Context(), orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if h.aiChatLogRepo != nil && token.UserID != "" {
		now := time.Now()
		// Save User Query
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: token.UserID, Role: "user", Content: "Tình hình mưa đang như thế nào?", ChatType: "support", Timestamp: now.Add(-1 * time.Second),
		})

		// Format AI Response
		displayText := ""
		if summary.RainyStations == 0 {
			displayText = "Hiện tại ghi nhận không có mưa tại tất cả các trạm."
		} else {
			displayText = fmt.Sprintf("Tình hình mưa hiện tại:\n- Tổng số trạm: %d\n- Số trạm đang có mưa: %d\n- Trạm mưa lớn nhất: %s (%.1fmm)\n\nChi tiết danh sách các trạm mưa:\n",
				summary.TotalStations, summary.RainyStations, summary.MaxRainStation.Name, summary.MaxRainStation.TotalRain)
			for _, m := range summary.Measurements {
				displayText += fmt.Sprintf("- %s: %.1fmm (%s - %s)\n", m.Name, m.TotalRain, m.StartTime, m.EndTime)
			}
		}

		// Save AI Response
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: token.UserID, Role: "model", Content: displayText, ChatType: "support", Timestamp: now,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   summary,
	})
}

func (h *GoogleHandler) GetWaterSummary(c *gin.Context) {
	token := h.contextWith.GetTokenFromContext(c)
	orgID := token.OrgID
	if token.IsCompany {
		orgID = ""
	}
	summary, err := h.googleSvc.GetWaterSummary(c.Request.Context(), orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Persist to chat history
	userID, _ := h.contextWith.GetUserID(c)
	if h.aiChatLogRepo != nil && userID != "" {
		now := time.Now()
		// Save User Query
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: userID, Role: "user", Content: "Tình hình mực nước sông, hồ?", ChatType: "support", Timestamp: now.Add(-1 * time.Second),
		})

		// Format AI Response
		displayText := "### Tình hình mực nước hiện tại\n\n"
		if len(summary.LakeStations) > 0 {
			displayText += "#### Hồ:\n"
			for _, s := range summary.LakeStations {
				displayText += fmt.Sprintf("- %s: %.2fm (%s)\n", s.Name, s.Level/100.0, s.ThoiGian)
			}
		}
		if len(summary.RiverStations) > 0 {
			displayText += "\n#### Sông:\n"
			for _, s := range summary.RiverStations {
				displayText += fmt.Sprintf("- %s: %.2fm (%s)\n", s.Name, s.Level/100.0, s.ThoiGian)
			}
		}

		// Save AI Response
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: userID, Role: "model", Content: displayText, ChatType: "support", Timestamp: now,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   summary,
	})
}

func (h *GoogleHandler) GetInundationSummary(c *gin.Context) {
	token := h.contextWith.GetTokenFromContext(c)
	orgID := token.OrgID
	if token.IsCompany {
		orgID = ""
	}
	summary, err := h.googleSvc.GetInundationSummary(c.Request.Context(), orgID, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Persist to chat history
	userID, _ := h.contextWith.GetUserID(c)
	if h.aiChatLogRepo != nil && userID != "" {
		now := time.Now()
		// Save User Query
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: userID, Role: "user", Content: "Những điểm đang ngập?", ChatType: "support", Timestamp: now.Add(-1 * time.Second),
		})

		// Format AI Response
		displayText := ""
		if summary.ActivePoints == 0 {
			displayText = "Hiện tại không có điểm ngập nào trên toàn thành phố."
		} else {
			displayText = fmt.Sprintf("Hiện có **%d** điểm đang ngập:\n\n", summary.ActivePoints)
			for _, p := range summary.OngoingPoints {
				displayText += fmt.Sprintf("- **%s**: %s (quản lý: %s)\n  *Bắt đầu:* %s\n", p.StreetName, p.Depth, p.OrgName, p.StartTime)
				if p.Description != "" {
					displayText += fmt.Sprintf("  *Mô tả:* %s\n", p.Description)
				}
			}
		}

		// Save AI Response
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: userID, Role: "model", Content: displayText, ChatType: "support", Timestamp: now,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   summary,
	})
}

func (h *GoogleHandler) ChatContract(c *gin.Context) {
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

	token := h.contextWith.GetTokenFromContext(c)
	response, err := h.geminiSvc.ChatContract(c.Request.Context(), body.Prompt, body.History, token.UserID, token.IsCompany, "")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   response,
	})
}

func (h *GoogleHandler) Chat(c *gin.Context) {
	var body struct {
		Prompt  string               `json:"prompt"`
		History []gemini.ChatMessage `json:"history"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	token := h.contextWith.GetTokenFromContext(c)
	fmt.Printf(" [Chat Handler] UserID: %s, Prompt length: %d\n", token.UserID, len(body.Prompt))
	response, err := h.geminiSvc.Chat(c.Request.Context(), body.Prompt, body.History, token.UserID, token.IsCompany, "")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   response,
	})
}

func (h *GoogleHandler) GetChatHistory(c *gin.Context) {
	userID, _ := h.contextWith.GetUserID(c)
	chatType := c.DefaultQuery("chat_type", "support")
	limitStr := c.DefaultQuery("limit", "50")
	beforeStr := c.Query("before")

	var limit int
	fmt.Sscanf(limitStr, "%d", &limit)

	var before time.Time
	if beforeStr != "" {
		// Attempt to parse RFC3339
		parsed, err := time.Parse(time.RFC3339, beforeStr)
		if err == nil {
			before = parsed
		} else {
			// Fallback to Unix timestamp if it's numeric
			var unix int64
			if _, err := fmt.Sscanf(beforeStr, "%d", &unix); err == nil {
				before = time.Unix(unix, 0)
			}
		}
	}

	fmt.Printf(" [Chat History Handler] UserID: %s, ChatType: %s, Limit: %d, Before: %v\n", userID, chatType, limit, before)
	logs, err := h.aiChatLogRepo.FindByUser(c.Request.Context(), userID, chatType, limit, before)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Reverse to send oldest first for the frontend to render sequentially
	for i, j := 0, len(logs)-1; i < j; i, j = i+1, j-1 {
		logs[i], logs[j] = logs[j], logs[i]
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   logs,
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

	// Persist to chat history as an AI response (since this is a detail view action)
	userID, _ := h.contextWith.GetUserID(c)
	if h.aiChatLogRepo != nil && userID != "" {
		now := time.Now()
		attachmentsText := ""
		if len(detail.Attachments) > 0 {
			attachmentsText = "\n\n**File đính kèm:**\n"
			for _, a := range detail.Attachments {
				attachmentsText += fmt.Sprintf("- [%s](%s)\n", a.Filename, a.URL)
			}
		}
		content := fmt.Sprintf("### %s\n**Từ:** %s\n**Ngày:** %s\n\n%s%s", detail.Subject, detail.From, detail.Date, detail.Body, attachmentsText)

		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: userID, Role: "model", Content: content, ChatType: "support", Timestamp: now,
		})
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

	// Persist to chat history
	userID, _ := h.contextWith.GetUserID(c)
	if h.aiChatLogRepo != nil && userID != "" {
		now := time.Now()
		// Save User Query
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: userID, Role: "user", Content: "Xem 10 email gần đây", ChatType: "support", Timestamp: now.Add(-1 * time.Second),
		})

		// Build table text similar to index.jsx
		tableText := "### Danh sách 10 email gần đây\n\n"
		if len(emails) == 0 {
			tableText += "Không tìm thấy email nào."
		} else {
			tableText += "| Người gửi | Tiêu đề | Thời gian | Thao tác |\n"
			tableText += "| :--- | :--- | :--- | :--- |\n"
			for _, m := range emails {
				tableText += fmt.Sprintf("| %s | %s | %s | [Xem chi tiết](#email-detail-%d) |\n", m.From, m.Subject, m.Date, m.ID)
			}
		}

		// Save AI Response
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: userID, Role: "model", Content: tableText, ChatType: "support", Timestamp: now,
		})
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

	// Persist to chat history
	userID, _ := h.contextWith.GetUserID(c)
	if h.aiChatLogRepo != nil && userID != "" {
		now := time.Now()
		// Save User Query
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: userID, Role: "user", Content: "Xem 10 email mới nhất", ChatType: "support", Timestamp: now.Add(-1 * time.Second),
		})

		// Build table text
		tableText := "### Danh sách 10 email mới nhất\n\n"
		if len(emails) == 0 {
			tableText += "Không tìm thấy email nào."
		} else {
			tableText += "| Người gửi | Tiêu đề | Thời gian | Thao tác |\n"
			tableText += "| :--- | :--- | :--- | :--- |\n"
			for _, m := range emails {
				tableText += fmt.Sprintf("| %s | %s | %s | [Xem chi tiết](#email-detail-%d) |\n", m.From, m.Subject, m.Date, m.ID)
			}
		}

		// Save AI Response
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: userID, Role: "model", Content: tableText, ChatType: "support", Timestamp: now,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   emails,
	})
}

func (h *GoogleHandler) GenerateQuickReport(c *gin.Context) {
	h.GenerateQuickReportV3(c)
}

func (h *GoogleHandler) GenerateQuickReportV3(c *gin.Context) {
	if h.driveSvc == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Google Drive service is not initialized."})
		return
	}

	ctx := c.Request.Context()
	now := time.Now()
	dd := now.Format("02")
	mm := now.Format("01")
	yyyy := now.Format("2006")
	hh := now.Format("15h04")
	shortHour := now.Format("15h")

	h.log.GetLogger().Infof(">>> Generating report V3 for %s-%s-%s %s", dd, mm, yyyy, hh)

	g, gCtx := errgroup.WithContext(ctx)
	var waterResp, rainResp struct {
		Content struct {
			Tram []map[string]interface{} `json:"tram"`
			Data []map[string]interface{} `json:"data"`
		} `json:"Content"`
	}

	// 1. Fetch Water Data
	g.Go(func() error {
		wData, err := h.weatherSvc.GetRawWaterData(gCtx)
		if err != nil {
			h.log.GetLogger().Warnf("Failed to fetch water data via weatherSvc: %v", err)
			return nil
		}
		// Map back to waterResp for compatibility with existing code
		for _, t := range wData.Content.Tram {
			waterResp.Content.Tram = append(waterResp.Content.Tram, map[string]interface{}{
				"Id":      t.Id,
				"TenTram": t.TenTram,
				"Loai":    t.Loai,
			})
		}
		for _, d := range wData.Content.Data {
			waterResp.Content.Data = append(waterResp.Content.Data, map[string]interface{}{
				"TramId":       d.TramId,
				"ThuongLuu_HT": d.ThuongLuu_HT,
				"Loai":         float64(d.Loai),
			})
		}
		return nil
	})

	// 2. Fetch Rain Data
	g.Go(func() error {
		rData, err := h.weatherSvc.GetRawRainData(gCtx)
		if err != nil {
			h.log.GetLogger().Warnf("Failed to fetch rain data via weatherSvc: %v", err)
			return nil
		}
		// Map back to rainResp for compatibility
		for _, t := range rData.Content.Tram {
			rainResp.Content.Tram = append(rainResp.Content.Tram, map[string]interface{}{
				"Id":        t.Id,
				"TenPhuong": t.TenPhuong,
				"TenTram":   t.TenTram,
			})
		}
		for _, d := range rData.Content.Data {
			rainResp.Content.Data = append(rainResp.Content.Data, map[string]interface{}{
				"TramId":      d.TramId,
				"LuongMua_HT": d.LuongMua_HT,
				"ThoiGian_BD": d.ThoiGian_BD,
				"ThoiGian_HT": d.ThoiGian_HT,
			})
		}
		return nil
	})

	// 3. Fetch Email Attachment (OCR first, standard fallback)
	extractedContent := ""
	g.Go(func() error {
		extractedContent = h.getLatestOCRText(gCtx)
		return nil
	})

	// 4. Fetch Inundation Summary
	motaUngNgap := " không xuất hiện điểm úng ngập"
	chiTietCacDiem := ""
	soLuongUngNgap := 0
	g.Go(func() error {
		if inundationSummary, err := h.googleSvc.GetInundationSummary(gCtx, "", nil); err == nil && inundationSummary != nil {
			soLuongUngNgap = inundationSummary.ActivePoints
			motaUngNgap = "có " + fmt.Sprintf("%d", inundationSummary.ActivePoints) + " điểm úng ngập"
			if inundationSummary.ActivePoints > 0 {
				var details []string
				for _, pt := range inundationSummary.OngoingPoints {
					depthInfo := pt.Length + " x " + pt.Width + " x " + pt.Depth
					if depthInfo == "" {
						depthInfo = "chưa rõ độ sâu"
					} else {
						depthInfo = "ngập " + depthInfo
					}
					details = append(details, fmt.Sprintf("%s (%s)", pt.StreetName, depthInfo))
				}
				chiTietCacDiem = strings.Join(details, ", ")
			}
		}
		return nil
	})

	// 5. Fetch Pumping Station Summary
	noiDungTramBom := ""
	g.Go(func() error {
		if pumpingSummary, err := h.googleSvc.GetPumpingStationSummary(gCtx, "", nil); err == nil && pumpingSummary != nil {
			var stInfos []string
			for _, st := range pumpingSummary.Stations {
				stInfos = append(stInfos, fmt.Sprintf("%s: %d tổ bơm, trong đó %d đang vận hành, %d đang đóng, %d đang bảo dưỡng. Cập nhật mới nhất: %s.", st.Name, st.PumpCount, st.OperatingCount, st.ClosedCount, st.MaintenanceCount, st.LastUpdate))
			}
			if len(stInfos) > 0 {
				noiDungTramBom = strings.Join(stInfos, "\n")
			}
		}
		return nil
	})

	_ = g.Wait()

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

	lakeDataRaw := [][]string{{"Hồ", "Mực nước"}}
	riverDataRaw := [][]string{{"Sông", "Mực nước"}}
	phuongDataRaw := [][]string{{"Phường", "Lượng mưa (mm)"}}
	xaDataRaw := [][]string{{"Xã", "Lượng mưa (mm)"}}

	type itemVal struct {
		name string
		val  float64
	}
	var lakes, rivers, phuongs, xas []itemVal

	parseNum := func(v interface{}) float64 {
		if f, ok := v.(float64); ok {
			return f
		}
		if s, ok := v.(string); ok {
			f, _ := strconv.ParseFloat(s, 64)
			return f
		}
		return 0
	}

	for _, d := range waterResp.Content.Data {
		tid, _ := d["TramId"].(string)
		val := parseNum(d["ThuongLuu_HT"])
		loai := parseNum(d["Loai"])
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
		val := parseNum(d["LuongMua_HT"])
		name := strings.TrimSpace(rainStations[tidStr])
		if name == "" {
			continue
		}
		if strings.Contains(strings.ToLower(name), "xã") {
			xas = append(xas, itemVal{name, val})
		} else {
			phuongs = append(phuongs, itemVal{name, val})
		}
	}

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

	timeMua := ""
	var minStart, maxEnd time.Time
	parseT := func(s interface{}) time.Time {
		if s == nil {
			return time.Time{}
		}
		sStr := fmt.Sprintf("%v", s)
		layouts := []string{"02/01/2006 15:04:05", "02/01/2006 15:04", "2006-01-02 15:04:05", "2006-01-02 15:04", time.RFC3339}
		for _, layout := range layouts {
			if t, err := time.ParseInLocation(layout, sStr, time.Local); err == nil {
				return t
			}
		}
		return time.Time{}
	}

	for _, d := range rainResp.Content.Data {
		if lmht, _ := d["LuongMua_HT"].(float64); lmht > 0 {
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

	noidung := "Báo cáo tình hình mưa"
	if h.geminiSvc != nil && extractedContent != "" {
		soDiemMua := len(phuongs) + len(xas)
		var prompt string
		if soDiemMua == 0 {
			prompt = fmt.Sprintf(`Dựa trên nội dung bản tin dự báo thời tiết sau:
---
%s
---
Và số liệu thực tế: HIỆN TẠI KHÔNG CÓ TRẠM NÀO GHI NHẬN MƯA.

Hãy tóm tắt thành 1 đoạn văn Báo cáo (DUY NHẤT 1 ĐOẠN) tuân theo đúng quy tắc sau:
- NẾU bản tin dự báo có đề cập đến các hình thế thời tiết cụ thể (như không khí lạnh, rãnh áp thấp, vùng hội tụ gió...), hãy viết: "Trên địa bàn thành phố hiện không ghi nhận điểm mưa nào, dù đang chịu ảnh hưởng của [tên hình thế thời tiết lấy từ bản tin]."
- NẾU bản tin dự báo KHÔNG đề cập rõ hình thế thời tiết nào cụ thể, hãy viết ĐƠN GIẢN là: "Hiện tại, trên địa bàn thành phố không ghi nhận điểm mưa nào." (TUYỆT ĐỐI KHÔNG dùng các cụm từ vô nghĩa như "chịu ảnh hưởng của tình hình thời tiết hiện trạng" hay "thời tiết hiện tại").
- LUÔN kết thúc đoạn văn bằng câu: "Lượng mưa đo được đến thời điểm %s ngày %s/%s/%s cụ thể như sau:"

Chỉ trả về nội dung đoạn văn, KHÔNG có lời chào, KHÔNG giải thích.`, extractedContent, hh, dd, mm, yyyy)
		} else {
			prompt = fmt.Sprintf(`Dựa trên nội dung bản tin dự báo thời tiết sau:
---
%s
---
Và số liệu thực tế: Có %d điểm đang ghi nhận mưa.

Hãy tóm tắt thành 1 đoạn văn Báo cáo (DUY NHẤT 1 ĐOẠN) tuân theo đúng quy tắc sau:
- Đánh giá mức độ: Nếu từ 1-4 điểm thì gọi là "mưa vùng", từ 5-10 điểm thì gọi là "mưa rải rác trên diện rộng", lớn hơn 10 điểm thì gọi là "mưa trên diện rộng".
- NẾU bản tin dự báo có đề cập tới hình thế thời tiết cụ thể (như không khí lạnh, rãnh áp thấp, vùng hội tụ...), hãy ghép thành câu: "Hiện tại, xuất hiện [mức độ mưa], nguyên nhân do ảnh hưởng của [tên hình thế thời tiết lấy từ bản tin]."
- NẾU bản tin dự báo KHÔNG có hình thế cụ thể, chỉ viết: "Hiện tại, trên địa bàn thành phố đang xuất hiện [mức độ mưa]." (Tuyệt đối không tự bịa ra nguyên nhân nếu không có).
- LUÔN kết thúc đoạn văn bằng câu: "Mưa dông xảy ra với lượng mưa đo được đến thời điểm %s ngày %s/%s/%s cụ thể như sau:"

Chỉ trả về nội dung đoạn văn, KHÔNG có lời chào, KHÔNG giải thích.`, extractedContent, soDiemMua, hh, dd, mm, yyyy)
		}

		if aiResult, err := h.geminiSvc.Chat(ctx, prompt, nil, "system_report", true, "SKIP_LOG"); err == nil && aiResult != "" {
			noidung = aiResult
		}
	}

	// Split tables into halves for 2-column layout
	splitTable := func(data [][]string) ([][]string, [][]string) {
		if len(data) <= 1 {
			return data, [][]string{data[0]} // header only
		}
		header := data[0]
		items := data[1:]
		half := (len(items) + 1) / 2
		t1 := append([][]string{header}, items[:half]...)
		t2 := append([][]string{header}, items[half:]...)
		return t1, t2
	}

	phuong1, phuong2 := splitTable(phuongDataRaw)
	xa1, xa2 := splitTable(xaDataRaw)

	hienTrangMua := "không còn mưa"
	if len(phuongs)+len(xas) > 0 {
		hienTrangMua = "tiếp tục có mưa"
	}

	payload := map[string]interface{}{
		"dd": dd, "mm": mm, "yyyy": yyyy, "hh": hh, "noidung": noidung, "time_mua": timeMua,
		"so_luong_ung_ngap": soLuongUngNgap,
		"mo_ta_ung_ngap":    motaUngNgap, "chi_tiet_cac_diem": chiTietCacDiem,
		"hien_trang_mua":    hienTrangMua,
		"noi_dung_tram_bom": noiDungTramBom,
		"table1_mua_phuong": phuong1, "table2_mua_phuong": phuong2,
		"table1_mua_xa": xa1, "table2_mua_xa": xa2,
		"table_song": riverDataRaw, "table_ho": lakeDataRaw,
	}

	targetFilename := fmt.Sprintf("Bao cao mua ngay %s-%s-%s thoi diem %s.docx", dd, mm, yyyy, shortHour)
	localTemplate := filepath.Join("doc", "Bao cao mua ngay {dd}-{mm}-{yyyy} thoi diem {hh}.docx")
	fileData, err := os.Open(localTemplate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Template document not found"})
		return
	}
	defer fileData.Close()

	reportsFolderID, err := h.driveSvc.FindOrCreateFolder(ctx, h.config.RootFolderID, "REPORTS")
	if err != nil {
		reportsFolderID = h.config.RootFolderID
	}

	templateFileID, err := h.driveSvc.UploadFile(ctx, reportsFolderID, targetFilename, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", fileData, true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload template"})
		return
	}

	reportResp, err := h.driveSvc.TriggerReportGeneration(ctx, h.config.AppsScriptWebhookURL, templateFileID, reportsFolderID, payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to trigger Apps Script"})
		return
	}

	resLink := h.extractReportLink(reportResp)
	if resLink == "" {
		resLink = fmt.Sprintf("https://docs.google.com/document/d/%s/edit", templateFileID)
	}

	// Persist to chat history
	userID, _ := h.contextWith.GetUserID(c)
	if h.aiChatLogRepo != nil && userID != "" {
		now := time.Now()
		// Save User Query
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: userID, Role: "user", Content: "Tạo báo cáo nhanh", ChatType: "support", Timestamp: now.Add(-1 * time.Second),
		})

		msgText := fmt.Sprintf("Đã tạo xong báo cáo nhanh! Bạn có thể xem và tải về tại đây:\n%s", resLink)
		// Save AI Response
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: userID, Role: "model", Content: msgText, ChatType: "support", Timestamp: now,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success", "data": gin.H{"report_url": resLink, "docID": templateFileID},
	})
}

func (h *GoogleHandler) GenerateQuickReportText(c *gin.Context) {
	if h.geminiSvc == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Gemini AI service is not initialized."})
		return
	}

	ctx := c.Request.Context()
	now := time.Now()
	reportTime := now.Format("15h04")
	reportDate := now.Format("02/01/2006")

	g, gCtx := errgroup.WithContext(ctx)
	var rainResp struct {
		Content struct {
			Tram []map[string]interface{} `json:"tram"`
			Data []map[string]interface{} `json:"data"`
		} `json:"Content"`
	}

	// 1. Fetch Rain Data
	g.Go(func() error {
		rData, err := h.weatherSvc.GetRawRainData(gCtx)
		if err != nil {
			h.log.GetLogger().Warnf("Failed to fetch rain data via weatherSvc: %v", err)
			return nil
		}
		for _, t := range rData.Content.Tram {
			rainResp.Content.Tram = append(rainResp.Content.Tram, map[string]interface{}{
				"Id":        t.Id,
				"TenPhuong": t.TenPhuong,
				"TenTram":   t.TenTram,
			})
		}
		for _, d := range rData.Content.Data {
			rainResp.Content.Data = append(rainResp.Content.Data, map[string]interface{}{
				"TramId":      d.TramId,
				"LuongMua_HT": d.LuongMua_HT,
				"ThoiGian_BD": d.ThoiGian_BD,
				"ThoiGian_HT": d.ThoiGian_HT,
			})
		}
		return nil
	})

	// 2. Fetch Inundation Summary
	inundationInfo := "Trên các tuyến đường an toàn, không xảy ra úng ngập"
	g.Go(func() error {
		if inundationSummary, err := h.googleSvc.GetInundationSummary(gCtx, "", nil); err == nil && inundationSummary != nil {
			if inundationSummary.ActivePoints > 0 {
				var details []string
				for _, pt := range inundationSummary.OngoingPoints {
					details = append(details, pt.StreetName)
				}
				inundationInfo = "Xuất hiện úng ngập tại: " + strings.Join(details, ", ")
			}
		}
		return nil
	})

	_ = g.Wait()

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

	var minStart, maxEnd time.Time
	var maxRain float64
	var maxRainStationName string
	var totalRainyPoints int
	var minRainVal, maxRainVal float64 = 9999, 0

	parseT := func(s interface{}) time.Time {
		if s == nil {
			return time.Time{}
		}
		sStr := fmt.Sprintf("%v", s)
		layouts := []string{"02/01/2006 15:04:05", "02/01/2006 15:04", "2006-01-02 15:04:05", "2006-01-02 15:04", time.RFC3339, "2006-01-02T15:04:05"}
		for _, layout := range layouts {
			if t, err := time.ParseInLocation(layout, sStr, time.Local); err == nil {
				return t
			}
		}
		return time.Time{}
	}

	for _, d := range rainResp.Content.Data {
		val, _ := d["LuongMua_HT"].(float64)
		if val > 0 {
			totalRainyPoints++
			if val < minRainVal {
				minRainVal = val
			}
			if val > maxRainVal {
				maxRainVal = val
			}
			var tidStr string
			if tid, ok := d["TramId"].(float64); ok {
				tidStr = fmt.Sprintf("%.0f", tid)
			} else if tid, ok := d["TramId"].(string); ok {
				tidStr = tid
			}
			if val > maxRain {
				maxRain = val
				maxRainStationName = rainStations[tidStr]
			}

			tBD := parseT(d["ThoiGian_BD"])
			tHT := parseT(d["ThoiGian_HT"])

			if !tBD.IsZero() && (minStart.IsZero() || tBD.Before(minStart)) {
				minStart = tBD
			}
			if !tHT.IsZero() && (maxEnd.IsZero() || tHT.After(maxEnd)) {
				maxEnd = tHT
			}
		}
	}

	if totalRainyPoints == 0 {
		report := fmt.Sprintf("Công ty Thoát nước Hà Nội báo cáo UBND Thành phố tình hình PCUN đô thị thời điểm: “%s ngày %s”: Hiện tại trên địa bàn Thành phố không có mưa; %s. Công ty sẽ tiếp tục theo dõi và báo cáo khi có diễn biến mới. Trân trọng./.", reportTime, reportDate, inundationInfo)

		// Persist to chat history
		userID, _ := h.contextWith.GetUserID(c)
		if h.aiChatLogRepo != nil && userID != "" {
			now := time.Now()
			// Save User Query
			_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
				UserID: userID, Role: "user", Content: "Báo cáo nhanh (Văn bản)", ChatType: "support", Timestamp: now.Add(-1 * time.Second),
			})
			// Save AI Response
			_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
				UserID: userID, Role: "model", Content: report, ChatType: "support", Timestamp: now,
			})
		}

		c.JSON(http.StatusOK, gin.H{"status": "success", "data": report})
		return
	}

	rainStartTime := "rạng sáng"
	if !minStart.IsZero() {
		rainStartTime = minStart.Format("15h04")
	}

	rainEndTime := "thời điểm hiện tại"
	if !maxEnd.IsZero() && time.Since(maxEnd) > 5*time.Minute {
		rainEndTime = maxEnd.Format("15h04")
	}

	rainIntensity := "nhỏ"
	if maxRainVal > 100 {
		rainIntensity = "rất lớn"
	} else if maxRainVal > 50 {
		rainIntensity = "lớn"
	}
	rainSpread := totalRainyPoints > 20

	rawSummary := fmt.Sprintf(`- Thời điểm báo cáo: %s ngày %s
- Thời điểm bắt đầu mưa: %s
- Thời điểm kết thúc mưa: %s
- Cường độ mưa: %s
- Diện mưa: %v (%d điểm đo)
- Lượng mưa phổ biến: %.1f đến %.1f mm
- Điểm mưa lớn nhất: %s (%.1f mm)
- Tình trạng úng ngập: %s
- Công tác triển khai: Các trạm bơm Yên Sở, Cổ Nhuế, Đồng Bông 1, Hầm chui... vận hành từ khi xuất hiện mưa để hạ mực nước hệ thống, đảm bảo giao thông.`,
		reportTime, reportDate, rainStartTime, rainEndTime, rainIntensity, map[bool]string{true: "diện rộng", false: "diện hẹp"}[rainSpread], totalRainyPoints, minRainVal, maxRainVal, maxRainStationName, maxRain, inundationInfo)

	prompt := fmt.Sprintf(`Vai trò: Trợ lý tổng hợp báo cáo kỹ thuật. 
Nhiệm vụ: Dựa vào DỮ LIỆU THÔ bên dưới, hãy viết lại thành một đoạn văn báo cáo CHÍNH XÁC theo MẪU BÁO CÁO yêu cầu.

DỮ LIỆU THÔ:
[%s]

MẪU BÁO CÁO YÊU CẦU:
Công ty Thoát nước Hà Nội báo cáo UBND Thành phố tình hình PCUN đô thị thời điểm: “[Giờ] ngày [Ngày]”: Trên địa bàn thành phố xuất hiện mưa từ [Thời điểm bắt đầu mưa] đến [Thời điểm kết thúc mưa]. Mưa cường độ [Cường độ mưa], [Diện rộng hay hẹp], lượng mưa phổ biến [Số mm] đến [Số mm]mm, riêng khu vực: [Tên trạm/phường lớn nhất] có lượng mưa lớn hơn [Số mm]mm; [Tình trạng úng ngập]; Công ty Thoát nước Hà Nội đã triển khai ứng trực tại các vị trí có khả năng ngập từ [Thời điểm bắt đầu mưa]; các trạm bơm Yên Sở, cổ nhuế, đồng bông 1, hầm chui... vận hành từ khi xuất hiện mưa để hạ mực nước hệ thống, đảm bảo giao thông ở hầm chui, các cửa phai vận hành theo quy định. Công ty sẽ tiếp tục báo cáo khi có diễn biến mưa trong thời gian tới. TRân trọng./.`, rawSummary)

	userID, _ := h.contextWith.GetUserID(c)
	aiResult, _ := h.geminiSvc.Chat(ctx, prompt, nil, userID, true, "Báo cáo nhanh (Văn bản)")
	c.JSON(http.StatusOK, gin.H{"status": "success", "data": aiResult})
}

func (h *GoogleHandler) GenerateAIDynamicReport(c *gin.Context) {
	if h.geminiSvc == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Gemini AI service is not initialized."})
		return
	}

	ctx := c.Request.Context()
	userID, _ := h.contextWith.GetUserID(c)
	now := time.Now()

	g, gCtx := errgroup.WithContext(ctx)

	// === Goroutine 1: OCR email forecast ===
	emailContent := ""
	g.Go(func() error {
		emailContent = h.getLatestOCRText(gCtx)
		return nil
	})

	// === Goroutine 2: Rain data ===
	rainSummary := ""
	g.Go(func() error {
		rData, err := h.weatherSvc.GetRawRainData(gCtx)
		if err != nil || rData == nil {
			return nil
		}
		stations := make(map[string]string)
		for _, t := range rData.Content.Tram {
			name := t.TenPhuong
			if name == "" {
				name = t.TenTram
			}
			key := fmt.Sprintf("%v", t.Id)
			stations[key] = name
		}
		type rainItem struct {
			name string
			val  float64
			bd   string
			ht   string
		}
		var items []rainItem
		rainyCount := 0
		for _, d := range rData.Content.Data {
			if d.LuongMua_HT > 0 {
				rainyCount++
				key := fmt.Sprintf("%v", d.TramId)
				name := stations[key]
				if name == "" {
					name = fmt.Sprintf("Trạm %v", d.TramId)
				}
				items = append(items, rainItem{name, d.LuongMua_HT, d.ThoiGian_BD, d.ThoiGian_HT})
			}
		}
		sort.Slice(items, func(i, j int) bool { return items[i].val > items[j].val })
		var lines []string
		for _, it := range items {
			lines = append(lines, fmt.Sprintf("  - %s: %.1fmm (từ %s đến %s)", it.name, it.val, it.bd, it.ht))
		}

		if rainyCount > 0 {
			displayCount := 15
			if len(items) < displayCount {
				displayCount = len(items)
			}
			rainSummary = fmt.Sprintf("Tổng số điểm đang có mưa: %d/%d trạm\nChi tiết %d điểm mưa lớn nhất:\n%s", rainyCount, len(rData.Content.Data), displayCount, strings.Join(lines[:displayCount], "\n"))
		} else {
			rainSummary = "Hiện tại không có mưa trên toàn thành phố."
		}
		return nil
	})

	// === Goroutine 3: Water data (rivers + lakes) ===
	waterSummary := ""
	g.Go(func() error {
		wData, err := h.weatherSvc.GetRawWaterData(gCtx)
		if err != nil || wData == nil {
			return nil
		}
		type waterItem struct {
			name string
			val  float64
			loai int
		}
		var lakes []waterItem
		for _, d := range wData.Content.Data {
			name := ""
			for _, t := range wData.Content.Tram {
				if t.Id == d.TramId {
					name = t.TenTram
					break
				}
			}
			if name == "" {
				continue
			}
			lakes = append(lakes, waterItem{name, float64(d.ThuongLuu_HT), d.Loai})
		}
		sort.Slice(lakes, func(i, j int) bool { return lakes[i].val > lakes[j].val })

		var lakeLines, riverLines []string
		for _, it := range lakes {
			line := fmt.Sprintf("  - %s: %.2fm", it.name, it.val/100.0)
			if it.loai == 2 {
				lakeLines = append(lakeLines, line)
			} else {
				riverLines = append(riverLines, line)
			}
		}
		var parts []string
		if len(lakeLines) > 0 {
			parts = append(parts, fmt.Sprintf("Hồ (%d trạm):\n%s", len(lakeLines), strings.Join(lakeLines, "\n")))
		}
		if len(riverLines) > 0 {
			parts = append(parts, fmt.Sprintf("Sông (%d trạm):\n%s", len(riverLines), strings.Join(riverLines, "\n")))
		}
		waterSummary = strings.Join(parts, "\n\n")
		return nil
	})

	// === Goroutine 4: Inundation status ===
	inundationSummary := ""
	g.Go(func() error {
		summary, err := h.googleSvc.GetInundationSummary(gCtx, "", nil)
		if err != nil || summary == nil {
			inundationSummary = "Không có dữ liệu."
			return nil
		}
		if summary.ActivePoints == 0 {
			inundationSummary = "Hiện tại không có điểm ngập nào trên toàn thành phố."
			return nil
		}
		var details []string
		for _, pt := range summary.OngoingPoints {
			depth := pt.Depth
			if depth == "" {
				depth = "chưa rõ"
			}
			org := pt.OrgName
			if org == "" {
				org = "chưa xác định"
			}
			details = append(details, fmt.Sprintf("  - %s (ngập %s, XN quản lý: %s)", pt.StreetName, depth, org))
		}
		inundationSummary = fmt.Sprintf("Tổng số điểm đang ngập: %d\nChi tiết:\n%s", summary.ActivePoints, strings.Join(details, "\n"))
		return nil
	})

	// === Goroutine 5: Pumping station status ===
	pumpingSummaryStr := ""
	g.Go(func() error {
		summary, err := h.googleSvc.GetPumpingStationSummary(gCtx, "", nil)
		if err != nil || summary == nil {
			pumpingSummaryStr = "Không có dữ liệu."
			return nil
		}
		if len(summary.Stations) == 0 {
			pumpingSummaryStr = "Không có trạm bơm nào được ghi nhận."
			return nil
		}
		var details []string
		for _, st := range summary.Stations {
			details = append(details, fmt.Sprintf("  - %s: %d tổ bơm, %d đang vận hành, %d đang đóng, %d đang bảo dưỡng. Cập nhật mới nhất: %s.", st.Name, st.PumpCount, st.OperatingCount, st.ClosedCount, st.MaintenanceCount, st.LastUpdate))
		}
		pumpingSummaryStr = fmt.Sprintf("Hiện tại, hệ thống ghi nhận có %d trạm bơm.\nChi tiết theo từng trạm:\n%s", len(summary.Stations), strings.Join(details, "\n"))
		return nil
	})

	// === Wait for all goroutines ===
	_ = g.Wait()

	// === Build prompt with pre-fetched data ===
	emailSection := ""
	if emailContent != "" {
		emailSection = fmt.Sprintf(`
### 4. BẢN TIN DỰ BÁO THỜI TIẾT (Trích xuất từ email, Trang 1):
%s`, emailContent)
	}

	prompt := fmt.Sprintf(`Thời điểm báo cáo: %s ngày %s

Dưới đây là DỮ LIỆU THU THẬP THỰC TẾ từ hệ thống giám sát thoát nước Hà Nội:

### 1. TÌNH HÌNH MƯA:
%s

### 2. MỰC NƯỚC SÔNG VÀ HỒ:
%s

### 3. TÌNH HÌNH ÚNG NGẬP:
%s

### 4. TÌNH HÌNH VẬN HÀNH CÁC TRẠM BƠM:
%s
%s

Dựa trên DỮ LIỆU THỰC TẾ ở trên, hãy viết 01 bản BÁO CÁO TỔNG HỢP TÌNH HÌNH THOÁT NƯỚC VÀ PHÒNG CHỐNG ÚNG NGẬP tại Hà Nội.

YÊU CẦU:
- Văn phong chuyên nghiệp, súc tích (độ dài vừa phải).
- Sử dụng ĐÚNG các thông số kỹ thuật đã cung cấp ở trên.
- Đề cập rõ tình hình vận hành các trạm bơm quan trọng (ví dụ: Yên Sở, Đồng Bông, v.v) dựa trên dữ liệu. Trình bày chi tiết trạm bơm theo cấu trúc: "[Tên trạm]: [Số lượng] tổ bơm, trong đó [chi tiết trạng thái vận hành/đóng/bảo dưỡng]. Cập nhật [thời gian/mới nhất: -]."
- Phân tích nguyên nhân mưa dựa trên bản tin dự báo (nếu có).
- Kết cấu báo cáo rõ ràng bằng tiếng Việt.
- Viết như một chuyên gia đang báo cáo cho lãnh đạo.`,
		now.Format("15h04"), now.Format("02/01/2006"),
		rainSummary, waterSummary, inundationSummary, pumpingSummaryStr, emailSection)

	aiResult, err := h.geminiSvc.Chat(ctx, prompt, nil, userID, true, "Tổng hợp tình hình hệ thống")
	if err != nil {
		h.log.GetLogger().Errorf("[GenerateAIDynamicReport] Gemini Chat Error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate dynamic report: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "data": aiResult})
}

func (h *GoogleHandler) extractReportLink(resp string) string {
	var data map[string]interface{}
	if err := json.Unmarshal([]byte(resp), &data); err != nil {
		return ""
	}
	keys := []string{"newDocId", "docID", "docId", "file_id", "fileId"}
	for _, k := range keys {
		if v, ok := data[k].(string); ok && v != "" {
			return fmt.Sprintf("https://docs.google.com/document/d/%s/edit", v)
		}
	}
	if nested, ok := data["data"].(map[string]interface{}); ok {
		for _, k := range keys {
			if v, ok := nested[k].(string); ok && v != "" {
				return fmt.Sprintf("https://docs.google.com/document/d/%s/edit", v)
			}
		}
		urlKeys := []string{"report_url", "file_url", "report_link", "fileUrl"}
		for _, k := range urlKeys {
			if v, ok := nested[k].(string); ok && v != "" {
				return v
			}
		}
	}
	urlKeys := []string{"report_url", "file_url", "fileUrl", "report_link"}
	for _, k := range urlKeys {
		if v, ok := data[k].(string); ok && v != "" {
			return v
		}
	}
	return ""
}
