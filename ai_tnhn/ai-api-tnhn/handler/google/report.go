package google

import (
	"ai-api-tnhn/internal/constants"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/googleapi"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/sync/errgroup"
)

func (h *handler) GenerateQuickReport(c *gin.Context) {
	h.GenerateQuickReportV3(c)
}

// GenerateQuickReportV3 godoc
// @Summary Tạo báo cáo nhanh tự động (V3)
// @Description Tổng hợp dữ liệu mưa, mực nước, ngập lụt và trạm bơm vào một báo cáo PDF/Drive duy nhất
// @Tags Tiện ích
// @Produce json
// @Security BearerAuth
// @Success 200 {object} web.Response{data=object}
// @Router /admin/google/quick-report [post]
func (h *handler) GenerateQuickReportV3(c *gin.Context) {
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
	var waterResp struct {
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
	var rainSum *googleapi.RainSummaryData
	g.Go(func() error {
		var err error
		rainSum, err = h.googleSvc.GetRainSummary(gCtx, "")
		if err != nil {
			h.log.GetLogger().Warnf("Failed to fetch rain summary via googleSvc: %v", err)
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
		if inundationSummary, err := h.googleSvc.GetInundationSummary(gCtx, "", true, nil); err == nil && inundationSummary != nil {
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
				if st.OperatingCount == 0 {
					continue
				}
				stInfos = append(stInfos, fmt.Sprintf("%s: %d/%d đang vận hành, cập nhật lúc: %s.", st.Name, st.OperatingCount, st.PumpCount, st.LastUpdate))
			}
			if len(stInfos) > 0 {
				noiDungTramBom = strings.Join(stInfos, "\n")
			} else {
				noiDungTramBom = "Hiện tại không ghi nhận trạm bơm nào đang vận hành."
			}
		}
		return nil
	})

	_ = g.Wait()

	lakeDataRaw := [][]string{{"Hồ", "Mực nước"}}
	riverDataRaw := [][]string{{"Sông", "Mực nước"}}
	phuongDataRaw := [][]string{{"Phường", "Lượng mưa (mm)"}}
	xaDataRaw := [][]string{{"Xã", "Lượng mưa (mm)"}}

	riverConfigs := []struct {
		id   string
		name string
	}{
		{"3", "Sông Tô Lịch (Đập Thanh Liệt)"},
		{"170", "Sông Nhuệ (Cống Hà Đông)"},
		{"4", "Sông Tô Lịch (Hoàng Quốc Việt)"},
		{"23", "Sông Kim Ngưu (Cống Lò Đúc)"},
		{"28", "Sông Lừ -HL CĐT Lừ Sét"},
	}
	lakeConfigs := []struct {
		id   string
		name string
	}{
		{"35", "Hồ Hoàn Kiếm"},
		{"33", "Hồ Tây A TL"},
		{"39", "Hồ Linh Đàm"},
		{"40", "Hồ Đống Đa"},
		{"42", "Hồ Định Công"},
	}

	fixedXas := []string{"Xã Tân Triều", "Xã Thanh Liệt", "Xã Vĩnh Quỳnh", "Xã Tam Hiệp", "Xã Tứ Hiệp", "Xã Ngũ Hiệp", "Xã Vạn Phúc", "Xã Hữu Hòa", "Xã Tả Thanh Oai", "Xã Đại Áng"}

	type itemVal struct {
		name string
		val  float64
	}
	var phuongs, xas []itemVal

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

	waterDataByID := make(map[string]float64)
	for _, d := range waterResp.Content.Data {
		tid, _ := d["TramId"].(string)
		val := parseNum(d["ThuongLuu_HT"])
		waterDataByID[tid] = val
	}

	for _, cfg := range lakeConfigs {
		val := waterDataByID[cfg.id]
		lakeDataRaw = append(lakeDataRaw, []string{cfg.name, fmt.Sprintf("%.2fm", val/100.0)})
	}
	for _, cfg := range riverConfigs {
		val := waterDataByID[cfg.id]
		riverDataRaw = append(riverDataRaw, []string{cfg.name, fmt.Sprintf("%.2fm", val/100.0)})
	}

	anyXaRain := false
	if rainSum != nil {
		for _, m := range rainSum.Measurements {
			val := m.TotalRain
			name := m.Name
			if strings.Contains(strings.ToLower(name), "xã") {
				xas = append(xas, itemVal{name, val})
				if val > 0 {
					anyXaRain = true
				}
			} else {
				phuongs = append(phuongs, itemVal{name, val})
			}
		}
	}

	sort.Slice(phuongs, func(i, j int) bool { return phuongs[i].val > phuongs[j].val })

	limit := func(vals []itemVal, n int) []itemVal {
		if len(vals) > n {
			return vals[:n]
		}
		return vals
	}
	for _, v := range limit(phuongs, 10) {
		phuongDataRaw = append(phuongDataRaw, []string{v.name, fmt.Sprintf("%.1f", v.val)})
	}

	if anyXaRain {
		xaRainMap := make(map[string]float64)
		for _, x := range xas {
			xaRainMap[x.name] = x.val
		}
		for _, name := range fixedXas {
			val := xaRainMap[name]
			xaDataRaw = append(xaDataRaw, []string{name, fmt.Sprintf("%.1f", val)})
		}
	} else {
		sort.Slice(xas, func(i, j int) bool { return xas[i].val > xas[j].val })
		for _, v := range limit(xas, 10) {
			xaDataRaw = append(xaDataRaw, []string{v.name, fmt.Sprintf("%.1f", v.val)})
		}
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

	if rainSum != nil {
		for _, m := range rainSum.Measurements {
			tbd := parseT(m.StartTimeFull)
			tht := parseT(m.EndTimeFull)
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

	soDiemMua := 0
	hasRainfall := false
	if rainSum != nil {
		soDiemMua = rainSum.RainyStations
		for _, m := range rainSum.Measurements {
			if m.TotalRain > 0 {
				hasRainfall = true
				break
			}
		}
	}

	noidung := "Báo cáo tình hình mưa"
	if h.geminiSvc != nil && extractedContent != "" {
		var prompt string
		if soDiemMua == 0 && hasRainfall {
			prompt = fmt.Sprintf(constants.PromptRainStopped, extractedContent, hh, dd, mm, yyyy)
		} else if soDiemMua == 0 {
			prompt = fmt.Sprintf(constants.PromptNoRain, extractedContent, hh, dd, mm, yyyy)
		} else {
			prompt = fmt.Sprintf(constants.PromptActiveRain, extractedContent, soDiemMua, hh, dd, mm, yyyy)
		}

		if aiResult, err := h.geminiSvc.Chat(ctx, prompt, nil, "system_report", true, "SKIP_LOG"); err == nil && aiResult != "" {
			noidung = aiResult
		}
	}

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
	if soDiemMua > 0 {
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

func (h *handler) GenerateQuickReportText(c *gin.Context) {
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
		if inundationSummary, err := h.googleSvc.GetInundationSummary(gCtx, "", true, nil); err == nil && inundationSummary != nil {
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

		userID, _ := h.contextWith.GetUserID(c)
		if h.aiChatLogRepo != nil && userID != "" {
			now := time.Now()
			_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
				UserID: userID, Role: "user", Content: "Báo cáo nhanh (Văn bản)", ChatType: "support", Timestamp: now.Add(-1 * time.Second),
			})
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

func (h *handler) GenerateAIDynamicReport(c *gin.Context) {
	if h.geminiSvc == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Gemini AI service is not initialized."})
		return
	}

	ctx := c.Request.Context()
	now := time.Now()

	g, gCtx := errgroup.WithContext(ctx)

	emailContent := ""
	g.Go(func() error {
		emailContent = h.getLatestOCRText(gCtx)
		return nil
	})

	var rainSum *googleapi.RainSummaryData
	g.Go(func() error {
		var err error
		rainSum, err = h.googleSvc.GetRainSummary(gCtx, "")
		if err != nil {
			h.log.GetLogger().Warnf("Failed to fetch rain summary: %v", err)
		}
		return nil
	})

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

	inundationSummary := ""
	g.Go(func() error {
		summary, err := h.googleSvc.GetInundationSummary(gCtx, "", true, nil)
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
			depth := pt.Length + "x" + pt.Width + "x" + pt.Depth
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
			details = append(details, fmt.Sprintf("  - %s: %d tổ bơm, %d bơm đang vận hành, %d bơm không vận hành, %d bơm đang bảo dưỡng. Cập nhật mới nhất: %s.", st.Name, st.PumpCount, st.OperatingCount, st.ClosedCount, st.MaintenanceCount, st.LastUpdate))
		}
		pumpingSummaryStr = fmt.Sprintf("Hiện tại, hệ thống ghi nhận có %d trạm bơm.\nChi tiết theo từng trạm:\n%s", len(summary.Stations), strings.Join(details, "\n"))
		return nil
	})

	_ = g.Wait()

	soDiemMua := 0
	hasRainfall := false
	if rainSum != nil {
		soDiemMua = rainSum.RainyStations
		for _, m := range rainSum.Measurements {
			if m.TotalRain > 0 {
				hasRainfall = true
				break
			}
		}
	}

	weatherSystems := []string{"không khí lạnh", "rãnh áp thấp", "vùng hội tụ gió", "áp cao lục địa", "áp cao lạnh lục địa", "hội tụ gió"}
	foundSystem := ""
	for _, sys := range weatherSystems {
		if strings.Contains(strings.ToLower(emailContent), sys) {
			foundSystem = sys
			break
		}
	}

	rainIntro := ""
	if soDiemMua == 0 {
		if hasRainfall {
			if foundSystem != "" {
				rainIntro = fmt.Sprintf("Hiện tại trên địa bàn thành phố không còn mưa, dù đang chịu ảnh hưởng của %s.", foundSystem)
			} else {
				rainIntro = "Hiện tại, trên địa bàn thành phố không còn mưa."
			}
		} else {
			if foundSystem != "" {
				rainIntro = fmt.Sprintf("Trên địa bàn thành phố hiện không ghi nhận điểm mưa nào, dù đang chịu ảnh hưởng của %s.", foundSystem)
			} else {
				rainIntro = "Hiện tại, trên địa bàn thành phố không ghi nhận điểm mưa nào."
			}
		}
	} else {
		mucDo := "mưa vùng"
		if soDiemMua > 10 {
			mucDo = "mưa trên diện rộng"
		} else if soDiemMua >= 5 {
			mucDo = "mưa rải rác trên diện rộng"
		}

		if foundSystem != "" {
			rainIntro = fmt.Sprintf("Hiện tại, xuất hiện %s, nguyên nhân do ảnh hưởng của %s.", mucDo, foundSystem)
		} else {
			rainIntro = fmt.Sprintf("Hiện tại, trên địa bàn thành phố đang xuất hiện %s.", mucDo)
		}
	}
	rainIntro += fmt.Sprintf(" Lượng mưa đo được đến thời điểm %s ngày %s cụ thể như sau:", now.Format("15h04"), now.Format("02/01/2006"))

	rainSummary := rainIntro + "\n"
	if rainSum != nil && len(rainSum.Measurements) > 0 {
		var lines []string
		for _, m := range rainSum.Measurements {
			status := "Đang mưa"
			if !m.IsRaining {
				status = fmt.Sprintf("Đã tạnh lúc %s", m.EndTime)
			}
			lines = append(lines, fmt.Sprintf("  - %s: %.1fmm (%s)", m.Name, m.TotalRain, status))
		}
		rainSummary += strings.Join(lines, "\n")
	}

	emailSection := ""
	if emailContent != "" {
		emailSection = fmt.Sprintf(`
### 5. BẢN TIN DỰ BÁO THỜI TIẾT (Trích xuất từ email, Trang 1):
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

### 5. THỜI TIẾT:
%s

### 6. PHÂN TÍCH VÀ ĐÁNH GIÁ:
Dựa trên DỮ LIỆU THỰC TẾ ở trên, hãy viết 01 bản BÁO CÁO TỔNG HỢP TÌNH HÌNH THOÁT NƯỚC VÀ PHÒNG CHỐNG ÚNG NGẬP tại Hà Nội.

YÊU CẦU:
- Văn phong chuyên nghiệp, súc tích (độ dài vừa phải).
- Sử dụng ĐÚNG các thông số kỹ thuật đã cung cấp ở trên.
- Đề cập rõ tình hình vận hành các trạm bơm quan trọng (ví dụ: Yên Sở, Đồng Bông, v.v) dựa trên dữ liệu. Trình bày chi tiết trạm bơm theo cấu trúc: "[Tên trạm]: [Số lượng] tổ bơm, trong đó [X] bơm đang vận hành, [Y] bơm không vận hành, [Z] bơm đang bảo dưỡng. Cập nhật [thời gian/mới nhất: -]."
- Phân tích nguyên nhân mưa dựa trên bản tin dự báo (nếu có).
- Kết cấu báo cáo rõ ràng bằng tiếng Việt.
- Viết như một chuyên gia đang báo cáo cho lãnh đạo.`,
		now.Format("15h04"), now.Format("02/01/2006"),
		rainSummary, waterSummary, inundationSummary, pumpingSummaryStr, emailSection)

	userID, _ := h.contextWith.GetUserID(c)
	aiResult, err := h.geminiSvc.Chat(ctx, prompt, nil, userID, true, "Tổng hợp tình hình hệ thống")
	if err != nil {
		h.log.GetLogger().Errorf("[GenerateAIDynamicReport] Gemini Chat Error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate dynamic report: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "data": aiResult})
}

func (h *handler) extractReportLink(resp string) string {
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
