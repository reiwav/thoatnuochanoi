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
	"golang.org/x/sync/errgroup"
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

	waterURL := "https://noibo.thoatnuochanoi.vn/api/thuytri/getallmucnuoc?id=3a1a672f-c56f-4752-b86c-455e30427b87"
	rainURL := "https://noibo.thoatnuochanoi.vn/api/thuytri/getallrain?id=3a1a672f-c56f-4752-b86c-455e30427b87"

	g, gCtx := errgroup.WithContext(ctx)
	client := resty.New()
	var waterResp, rainResp struct {
		Content struct {
			Tram []map[string]interface{} `json:"tram"`
			Data []map[string]interface{} `json:"data"`
		} `json:"Content"`
	}

	// 1. Fetch Water Data
	g.Go(func() error {
		wResp, err := client.R().SetContext(gCtx).SetResult(&waterResp).Get(waterURL)
		if err != nil || wResp.IsError() {
			h.log.GetLogger().Warnf("Failed to fetch water data: %v", err)
		}
		return nil
	})

	// 2. Fetch Rain Data
	g.Go(func() error {
		rResp, err := client.R().SetContext(gCtx).SetResult(&rainResp).Get(rainURL)
		if err != nil || rResp.IsError() {
			h.log.GetLogger().Warnf("Failed to fetch rain data: %v", err)
		}
		return nil
	})

	// 3. Fetch Email Attachment
	extractedContent := ""
	g.Go(func() error {
		if h.emailSvc != nil {
			if content, err := h.emailSvc.GetLatestEmailAttachmentPage1(gCtx); err == nil && content != "" {
				extractedContent = content
			}
		}
		return nil
	})

	// 4. Fetch Inundation Summary
	soLuongUngNgap := 0
	chiTietCacDiem := ""
	g.Go(func() error {
		if inundationSummary, err := h.googleSvc.GetInundationSummary(gCtx); err == nil && inundationSummary != nil {
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

	lakeDataRaw := [][]string{{"Tên Trạm", "Mực nước"}}
	riverDataRaw := [][]string{{"Tên Trạm", "Mực nước"}}
	phuongDataRaw := [][]string{{"Tên Phường", "Lượng mưa"}}
	xaDataRaw := [][]string{{"Tên Xã", "Lượng mưa"}}

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
		if name == "" { continue }
		if loai == 2 { lakes = append(lakes, itemVal{name, val}) } else { rivers = append(rivers, itemVal{name, val}) }
	}

	for _, d := range rainResp.Content.Data {
		var tidStr string
		if tid, ok := d["TramId"].(float64); ok { tidStr = fmt.Sprintf("%.0f", tid) } else if tid, ok := d["TramId"].(string); ok { tidStr = tid }
		val, _ := d["LuongMua_HT"].(float64)
		name := rainStations[tidStr]
		if name == "" { continue }
		if strings.Contains(strings.ToLower(name), "xã") { xas = append(xas, itemVal{name, val}) } else { phuongs = append(phuongs, itemVal{name, val}) }
	}

	sort.Slice(lakes, func(i, j int) bool { return lakes[i].val > lakes[j].val })
	sort.Slice(rivers, func(i, j int) bool { return rivers[i].val > rivers[j].val })
	sort.Slice(phuongs, func(i, j int) bool { return phuongs[i].val > phuongs[j].val })
	sort.Slice(xas, func(i, j int) bool { return xas[i].val > xas[j].val })

	limit := func(vals []itemVal, n int) []itemVal {
		if len(vals) > n { return vals[:n] }
		return vals
	}

	for _, v := range limit(lakes, 5) { lakeDataRaw = append(lakeDataRaw, []string{v.name, fmt.Sprintf("%.2fm", v.val/100.0)}) }
	for _, v := range limit(rivers, 5) { riverDataRaw = append(riverDataRaw, []string{v.name, fmt.Sprintf("%.2fm", v.val/100.0)}) }
	for _, v := range limit(phuongs, 10) { phuongDataRaw = append(phuongDataRaw, []string{v.name, fmt.Sprintf("%.1f", v.val)}) }
	for _, v := range limit(xas, 10) { xaDataRaw = append(xaDataRaw, []string{v.name, fmt.Sprintf("%.1f", v.val)}) }

	timeMua := ""
	var minStart, maxEnd time.Time
	parseT := func(s interface{}) time.Time {
		if s == nil { return time.Time{} }
		sStr := fmt.Sprintf("%v", s)
		layouts := []string{"02/01/2006 15:04:05", "02/01/2006 15:04", "2006-01-02 15:04:05", "2006-01-02 15:04", time.RFC3339}
		for _, layout := range layouts {
			if t, err := time.ParseInLocation(layout, sStr, time.Local); err == nil { return t }
		}
		return time.Time{}
	}

	for _, d := range rainResp.Content.Data {
		if lmht, _ := d["LuongMua_HT"].(float64); lmht > 0 {
			tbd := parseT(d["ThoiGian_BD"])
			tht := parseT(d["ThoiGian_HT"])
			if !tbd.IsZero() && (minStart.IsZero() || tbd.Before(minStart)) { minStart = tbd }
			if !tht.IsZero() && (maxEnd.IsZero() || tht.After(maxEnd)) { maxEnd = tht }
		}
	}
	if !minStart.IsZero() && !maxEnd.IsZero() { timeMua = fmt.Sprintf("%s đến %s", minStart.Format("15h04'"), maxEnd.Format("15h04'")) }

	noidung := "Báo cáo tình hình mưa"
	if h.geminiSvc != nil && extractedContent != "" {
		prompt := fmt.Sprintf(`hãy phân tích và viết nội dung báo cáo thật ngắn gọn (1-2 câu), tập trung vào nguyên nhân gây mưa (nếu có) dựa trên: số điểm đang có mưa (%d), và nội dung từ email dự báo/cảnh báo: [%s]. Tuân thủ quy tắc: Nếu < 5 điểm là "Mưa vùng", 5-10: "Mưa rải rác trên diện rộng", > 10: "Mưa trên diện rộng". KHÔNG bao gồm thông tin nhiệt độ, gió, độ ẩm hay các dự báo thời tiết chi tiết về con người/giao thông.`, len(phuongs)+len(xas), extractedContent)
		if aiResult, err := h.geminiSvc.Chat(ctx, prompt, nil, "system_report"); err == nil && aiResult != "" { 
			noidung = aiResult 
		}
	}

	payload := map[string]interface{}{
		"dd": dd, "mm": mm, "yyyy": yyyy, "hh": hh, "noidung": noidung, "time_mua": timeMua,
		"so_luong_ung_ngap": soLuongUngNgap, "chi_tiet_cac_diem": chiTietCacDiem, "table_mua_phuong": phuongDataRaw, "table_mua_xa": xaDataRaw,
		"table_song_ho": map[string]interface{}{"river": riverDataRaw, "lake": lakeDataRaw},
	}

	targetFilename := fmt.Sprintf("Báo cáo mưa ngày %s-%s-%s thời điểm %s.docx", dd, mm, yyyy, shortHour)
	localTemplate := filepath.Join("doc", "Báo cáo mưa ngày {dd}-{mm}-{yyyy} thời điểm {hh}.docx")
	fileData, err := os.Open(localTemplate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Template document not found"})
		return
	}
	defer fileData.Close()

	reportsFolderID, err := h.driveSvc.FindOrCreateFolder(ctx, h.config.RootFolderID, "REPORTS")
	if err != nil { reportsFolderID = h.config.RootFolderID }

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
	if resLink == "" { resLink = fmt.Sprintf("https://docs.google.com/document/d/%s/edit", templateFileID) }

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

	rainURL := "https://noibo.thoatnuochanoi.vn/api/thuytri/getallrain?id=3a1a672f-c56f-4752-b86c-455e30427b87"
	g, gCtx := errgroup.WithContext(ctx)
	client := resty.New()
	var rainResp struct {
		Content struct {
			Tram []map[string]interface{} `json:"tram"`
			Data []map[string]interface{} `json:"data"`
		} `json:"Content"`
	}

	// 1. Fetch Rain Data
	g.Go(func() error {
		client.R().SetContext(gCtx).SetResult(&rainResp).Get(rainURL)
		return nil
	})

	// 2. Fetch Inundation Summary
	inundationInfo := "Trên các tuyến đường an toàn, không xảy ra úng ngập"
	g.Go(func() error {
		if inundationSummary, err := h.googleSvc.GetInundationSummary(gCtx); err == nil && inundationSummary != nil {
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
		if id, ok := t["Id"].(float64); ok { idStr = fmt.Sprintf("%.0f", id) } else if id, ok := t["Id"].(string); ok { idStr = id }
		name, _ := t["TenPhuong"].(string)
		if name == "" { name, _ = t["TenTram"].(string) }
		rainStations[idStr] = name
	}

	var minStart time.Time
	var maxRain float64
	var maxRainStationName string
	var totalRainyPoints int
	var minRainVal, maxRainVal float64 = 9999, 0

	for _, d := range rainResp.Content.Data {
		val, _ := d["LuongMua_HT"].(float64)
		if val > 0 {
			totalRainyPoints++
			if val < minRainVal { minRainVal = val }
			if val > maxRainVal { maxRainVal = val }
			var tidStr string
			if tid, ok := d["TramId"].(float64); ok { tidStr = fmt.Sprintf("%.0f", tid) } else if tid, ok := d["TramId"].(string); ok { tidStr = tid }
			if val > maxRain { maxRain = val; maxRainStationName = rainStations[tidStr] }
			layouts := []string{"02/01/2006 15:04:05", "02/01/2006 15:04", "2006-01-02 15:04:05", "2006-01-02 15:04", time.RFC3339}
			for _, l := range layouts {
				if t, err := time.ParseInLocation(l, fmt.Sprintf("%v", d["ThoiGian_BD"]), time.Local); err == nil {
					if minStart.IsZero() || t.Before(minStart) { minStart = t }
					break
				}
			}
		}
	}

	if totalRainyPoints == 0 {
		report := fmt.Sprintf("Công ty Thoát nước Hà Nội báo cáo UBND Thành phố tình hình PCUN đô thị thời điểm: “%s ngày %s”: Hiện tại trên địa bàn Thành phố không có mưa; %s. Công ty sẽ tiếp tục theo dõi và báo cáo khi có diễn biến mới. Trân trọng./.", reportTime, reportDate, inundationInfo)
		c.JSON(http.StatusOK, gin.H{"status": "success", "data": report})
		return
	}

	rainStartTime := "rạng sáng"
	if !minStart.IsZero() { rainStartTime = minStart.Format("15h04") }
	rainIntensity := "nhỏ"
	if maxRainVal > 100 { rainIntensity = "rất lớn" } else if maxRainVal > 50 { rainIntensity = "lớn" }
	rainSpread := totalRainyPoints > 20

	rawSummary := fmt.Sprintf(`- Thời điểm báo cáo: %s ngày %s
- Thời điểm bắt đầu mưa: %s
- Cường độ mưa: %s
- Diện mưa: %v (%d điểm đo)
- Lượng mưa phổ biến: %.1f đến %.1f mm
- Điểm mưa lớn nhất: %s (%.1f mm)
- Tình trạng úng ngập: %s
- Công tác triển khai: Các trạm bơm Yên Sở, Cổ Nhuế, Đồng Bông 1, Hầm chui... vận hành từ khi xuất hiện mưa để hạ mực nước hệ thống, đảm bảo giao thông.`,
		reportTime, reportDate, rainStartTime, rainIntensity, map[bool]string{true: "diện rộng", false: "diện hẹp"}[rainSpread], totalRainyPoints, minRainVal, maxRainVal, maxRainStationName, maxRain, inundationInfo)

	prompt := fmt.Sprintf(`Vai trò: Trợ lý tổng hợp báo cáo kỹ thuật. 
Nhiệm vụ: Dựa vào DỮ LIỆU THÔ bên dưới, hãy viết lại thành một đoạn văn báo cáo CHÍNH XÁC theo MẪU BÁO CÁO yêu cầu.

DỮ LIỆU THÔ:
[%s]

MẪU BÁO CÁO YÊU CẦU:
Công ty Thoát nước Hà Nội báo cáo UBND Thành phố tình hình PCUN đô thị thời điểm: “[Giờ] ngày [Ngày]”: Trên địa bàn thành phố xuất hiện mưa từ [Thời điểm bắt đầu mưa] đến thời điểm hiện tại. Mưa cường độ [Cường độ mưa], [Diện rộng hay hẹp], lượng mưa phổ biến [Số mm] đến [Số mm]mm, riêng phường: [Tên trạm/phường lớn nhất] có lượng mưa lớn hơn [Số mm]mm; [Tình trạng úng ngập]; Công ty Thoát nước Hà Nội đã triển khai ứng trực tại các vị trí có khả năng ngập từ [Thời điểm bắt đầu mưa]; các trạm bơm Yên Sở, cổ nhuế, đồng bông 1, hầm chui... vận hành từ khi xuất hiện mưa để hạ mực nước hệ thống, đảm bảo giao thông ở hầm chui, các cửa phai vận hành theo quy định. Công ty sẽ tiếp tục báo cáo khi có diễn biến mưa trong thời gian tới. TRân trọng./.`, rawSummary)

	aiResult, _ := h.geminiSvc.Chat(ctx, prompt, nil, "system_report_text")
	c.JSON(http.StatusOK, gin.H{"status": "success", "data": aiResult})
}

func (h *GoogleHandler) GenerateAIDynamicReport(c *gin.Context) {
	if h.geminiSvc == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Gemini AI service is not initialized."})
		return
	}

	ctx := c.Request.Context()
	userID, _ := h.contextWith.GetUserID(c)

	prompt := `Dựa trên dữ liệu thực tế hiện tại từ hệ thống, hãy thực hiện các bước sau:
1. Tổng hợp tình hình mưa hiện tại (lượng mưa lớn nhất ở đâu, bao nhiêu điểm đang có mưa).
2. Kiểm tra tình hình ngập lụt (có bao nhiêu điểm đang ngập, vị trí cụ thể và XÍ NGHIỆP đang quản lý/ứng trực tại đó).
3. Kiểm tra mực nước sông và hồ hiện tại (trình trạng hạ mực nước để đón mưa).
4. (Nếu có) Đọc nội dung email cảnh báo/dự báo thời tiết gần nhất để biết nguyên nhân và dự báo tiếp theo.

Từ các dữ liệu trên, hãy viết một bản BÁO CÁO TỔNG HỢP TÌNH HÌNH THOÁT NƯỚC VÀ PHÒNG CHỐNG ÚNG NGẬP tại Hà Nội ngay lúc này. 

YÊU CẦU:
- Văn phong chuyên nghiệp, súc tích, chính xác.
- Sử dụng các thông số kỹ thuật thực tế thu thập được.
- Hiển thị rõ tên XÍ NGHIỆP quản lý cho từng điểm ngập để lãnh đạo nắm được đơn vị chịu trách nhiệm.
- Làm nổi bật những vấn đề cấp bách (nếu có).
- Kết cấu báo cáo rõ ràng bằng tiếng Việt.
- Không sử dụng ngôn ngữ quá máy móc, hãy viết như một chuyên gia đang báo cáo cho lãnh đạo.`

	aiResult, err := h.geminiSvc.Chat(ctx, prompt, nil, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate dynamic report"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "data": aiResult})
}

func (h *GoogleHandler) extractReportLink(resp string) string {
	var data map[string]interface{}
	if err := json.Unmarshal([]byte(resp), &data); err != nil { return "" }
	keys := []string{"newDocId", "docID", "docId", "file_id", "fileId"}
	for _, k := range keys { if v, ok := data[k].(string); ok && v != "" { return fmt.Sprintf("https://docs.google.com/document/d/%s/edit", v) } }
	if nested, ok := data["data"].(map[string]interface{}); ok {
		for _, k := range keys { if v, ok := nested[k].(string); ok && v != "" { return fmt.Sprintf("https://docs.google.com/document/d/%s/edit", v) } }
		urlKeys := []string{"report_url", "file_url", "report_link", "fileUrl"}
		for _, k := range urlKeys { if v, ok := nested[k].(string); ok && v != "" { return v } }
	}
	urlKeys := []string{"report_url", "file_url", "fileUrl", "report_link"}
	for _, k := range urlKeys { if v, ok := data[k].(string); ok && v != "" { return v } }
	return ""
}
