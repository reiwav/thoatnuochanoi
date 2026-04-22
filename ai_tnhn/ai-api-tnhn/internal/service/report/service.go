package report

import (
	"ai-api-tnhn/config"
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/constants"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/email"
	"ai-api-tnhn/internal/service/google/gemini"
	"ai-api-tnhn/internal/service/google/googleapi"
	"ai-api-tnhn/internal/service/google/googledrive"
	"ai-api-tnhn/internal/service/inundation"
	pumpingstation "ai-api-tnhn/internal/service/pumping_station"
	"ai-api-tnhn/internal/service/station"
	"ai-api-tnhn/internal/service/water"
	"ai-api-tnhn/internal/service/weather"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"golang.org/x/sync/errgroup"
)

type QuickReportResult struct {
	ReportURL string `json:"report_url"`
	DocID     string `json:"doc_id"`
}

type Service interface {
	GenerateQuickReportV3(ctx context.Context, userID string) (*QuickReportResult, error)
	GenerateQuickReportText(ctx context.Context, userID string) (string, error)
	GenerateAIDynamicReport(ctx context.Context, userID string) (string, error)
}

type service struct {
	cfg           *config.Config
	log           logger.Logger
	weatherSvc    weather.Service
	googleSvc     googleapi.Service
	inuSvc        inundation.Service
	pumpingSvc    pumpingstation.Service
	stationSvc    station.Service
	waterSvc      water.Service
	driveSvc      googledrive.Service
	geminiSvc     gemini.Service
	emailSvc      email.Service
	aiChatLogRepo repository.AiChatLog
	cachedOCRText string
	cachedEmailID uint32
	ocrMu         sync.RWMutex
}

func NewService(
	cfg *config.Config,
	log logger.Logger,
	weatherSvc weather.Service,
	googleSvc googleapi.Service,
	inuSvc inundation.Service,
	pumpingSvc pumpingstation.Service,
	stationSvc station.Service,
	waterSvc water.Service,
	driveSvc googledrive.Service,
	geminiSvc gemini.Service,
	emailSvc email.Service,
	aiChatLogRepo repository.AiChatLog,
) Service {
	return &service{
		cfg:           cfg,
		log:           log,
		weatherSvc:    weatherSvc,
		googleSvc:     googleSvc,
		inuSvc:        inuSvc,
		pumpingSvc:    pumpingSvc,
		stationSvc:    stationSvc,
		waterSvc:      waterSvc,
		driveSvc:      driveSvc,
		geminiSvc:     geminiSvc,
		emailSvc:      emailSvc,
		aiChatLogRepo: aiChatLogRepo,
	}
}

func (s *service) GenerateQuickReportV3(ctx context.Context, userID string) (*QuickReportResult, error) {
	if s.driveSvc == nil {
		return nil, fmt.Errorf("Google Drive service is not initialized")
	}

	now := time.Now()
	dd := now.Format("02")
	mm := now.Format("01")
	yyyy := now.Format("2006")
	hh := now.Format("15h04")
	shortHour := now.Format("15h")

	s.log.GetLogger().Infof(">>> Generating report V3 for %s-%s-%s %s", dd, mm, yyyy, hh)

	g, gCtx := errgroup.WithContext(ctx)

	// 1. Fetch Water Data
	var waterSummary *water.WaterSummaryData
	g.Go(func() error {
		var err error
		waterSummary, err = s.waterSvc.GetWaterSummary(gCtx, "", nil)
		if err != nil {
			s.log.GetLogger().Warnf("Failed to fetch water summary: %v", err)
		}
		return nil
	})

	// 2. Fetch Rain Data
	var rainSum *weather.RainSummaryData
	g.Go(func() error {
		var err error
		rainSum, err = s.weatherSvc.GetRainSummary(gCtx, "", nil)
		if err != nil {
			s.log.GetLogger().Warnf("Failed to fetch rain summary: %v", err)
		}
		return nil
	})

	// 3. Fetch Email Attachment (OCR)
	extractedContent := ""
	g.Go(func() error {
		extractedContent = s.getLatestOCRText(gCtx)
		return nil
	})

	// 4. Fetch Inundation Summary
	motaUngNgap := " không xuất hiện điểm úng ngập"
	chiTietCacDiem := ""
	soLuongUngNgap := 0
	g.Go(func() error {
		if inundationSummary, err := s.inuSvc.GetInundationSummary(gCtx, "", true, nil); err == nil && inundationSummary != nil {
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
		if pumpingSummary, err := s.pumpingSvc.GetPumpingStationSummary(gCtx, "", nil); err == nil && pumpingSummary != nil {
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

	// Water mapping (River/Lake)
	if waterSummary != nil {
		lakeMap := make(map[string]float64)
		for _, st := range waterSummary.LakeStations {
			lakeMap[st.Name] = st.Level
		}
		riverMap := make(map[string]float64)
		for _, st := range waterSummary.RiverStations {
			riverMap[st.Name] = st.Level
		}

		// Use station name to find level because old IDs are not directly in water summary stats yet
		// Actually the existing code used IDs. I'll need to be careful.
		// Since I refactored GetWaterSummary, I'll need a way to map them.
		// For now, let's look at how I implemented GetWaterSummary. It returns Station names.
		// The original code used ID mapping.
		// I'll re-fetch raw water data if needed, or update GetWaterSummary to include IDs.
		// Let's just re-fetch raw for now to minimize logic breakage for the report.
		rawWater, _ := s.weatherSvc.GetRawWaterData(ctx)
		waterDataByID := make(map[string]float64)
		if rawWater != nil {
			for _, d := range rawWater.Content.Data {
				waterDataByID[d.TramId] = d.ThuongLuu_HT
			}
			// Actually d.TramId in the response.
		}
		// Let's use name matching instead for better domain service usage if possible.
		// But naming can be inconsistent.

		// Fallback to re-fetching raw data mapping in the service
	}

	// For simplicity, I'll stick to the original logic but within the service.
	// Re-fetching raw data inside the service is fine.
	wDataRaw, _ := s.weatherSvc.GetRawWaterData(ctx)
	waterDataByID := make(map[string]float64)
	if wDataRaw != nil {
		for _, d := range wDataRaw.Content.Data {
			waterDataByID[d.TramId] = d.ThuongLuu_HT
		}
	}

	for _, cfg := range lakeConfigs {
		val := waterDataByID[cfg.id]
		lakeDataRaw = append(lakeDataRaw, []string{cfg.name, fmt.Sprintf("%.2fm", val/100.0)})
	}
	for _, cfg := range riverConfigs {
		val := waterDataByID[cfg.id]
		riverDataRaw = append(riverDataRaw, []string{cfg.name, fmt.Sprintf("%.2fm", val/100.0)})
	}

	type itemVal struct {
		name string
		val  float64
	}
	var phuongs, xas []itemVal

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
	if s.geminiSvc != nil && extractedContent != "" {
		var prompt string
		if soDiemMua == 0 && hasRainfall {
			prompt = fmt.Sprintf(constants.PromptRainStopped, extractedContent, hh, dd, mm, yyyy)
		} else if soDiemMua == 0 {
			prompt = fmt.Sprintf(constants.PromptNoRain, extractedContent, hh, dd, mm, yyyy)
		} else {
			prompt = fmt.Sprintf(constants.PromptActiveRain, extractedContent, soDiemMua, hh, dd, mm, yyyy)
		}

		if aiResult, err := s.geminiSvc.Chat(ctx, prompt, nil, "system_report", true, "SKIP_LOG"); err == nil && aiResult != "" {
			noidung = aiResult
		}
	}

	splitTable := func(data [][]string) ([][]string, [][]string) {
		if len(data) <= 1 {
			if len(data) == 1 {
				return data, [][]string{data[0]}
			}
			return [][]string{}, [][]string{}
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
		return nil, fmt.Errorf("template document not found")
	}
	defer fileData.Close()

	reportsFolderID, err := s.driveSvc.FindOrCreateFolder(ctx, s.cfg.GoogleDriveConfig.RootFolderID, "REPORTS")
	if err != nil {
		reportsFolderID = s.cfg.GoogleDriveConfig.RootFolderID
	}

	templateFileID, err := s.driveSvc.UploadFile(ctx, reportsFolderID, targetFilename, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", fileData, true)
	if err != nil {
		return nil, fmt.Errorf("failed to upload template: %w", err)
	}

	reportResp, err := s.driveSvc.TriggerReportGeneration(ctx, s.cfg.GoogleDriveConfig.AppsScriptWebhookURL, templateFileID, reportsFolderID, payload)
	if err != nil {
		return nil, fmt.Errorf("failed to trigger Apps Script: %w", err)
	}

	resLink := s.extractReportLink(reportResp)
	if resLink == "" {
		resLink = fmt.Sprintf("https://docs.google.com/document/d/%s/edit", templateFileID)
	}

	// Persist to chat history
	if s.aiChatLogRepo != nil && userID != "" {
		now := time.Now()
		_ = s.aiChatLogRepo.Save(ctx, &models.AiChatLog{
			UserID: userID, Role: "user", Content: "Tạo báo cáo nhanh", ChatType: "support", Timestamp: now.Add(-1 * time.Second),
		})

		msgText := fmt.Sprintf("Đã tạo xong báo cáo nhanh! Bạn có thể xem và tải về tại đây:\n%s", resLink)
		_ = s.aiChatLogRepo.Save(ctx, &models.AiChatLog{
			UserID: userID, Role: "model", Content: msgText, ChatType: "support", Timestamp: now,
		})
	}

	return &QuickReportResult{
		ReportURL: resLink,
		DocID:     templateFileID,
	}, nil
}

func (s *service) getLatestOCRText(ctx context.Context) string {
	if s.emailSvc == nil || s.geminiSvc == nil {
		return ""
	}

	id, err := s.emailSvc.GetLatestWeatherEmailID(ctx)
	if err != nil {
		s.log.GetLogger().Warnf("Failed to get latest weather email ID: %v", err)
		return ""
	}

	s.ocrMu.RLock()
	if id <= s.cachedEmailID && s.cachedOCRText != "" {
		text := s.cachedOCRText
		s.ocrMu.RUnlock()
		s.log.GetLogger().Infof("QuickReport: Using cached OCR text from email ID %d", id)
		return text
	}
	s.ocrMu.RUnlock()

	// Download and extract if new ID or cache empty
	s.log.GetLogger().Infof("QuickReport: Fetching new OCR text for email ID %d", id)
	raw, _, err := s.emailSvc.GetEmailAttachmentRawByID(ctx, id)
	if err != nil || len(raw) == 0 {
		s.log.GetLogger().Warnf("Failed to fetch email raw attachment: %v", err)
		return ""
	}

	ocrText, geminiErr := s.geminiSvc.ExtractTextFromPDF(ctx, raw)
	if geminiErr == nil && ocrText != "" {
		s.ocrMu.Lock()
		s.cachedEmailID = id
		s.cachedOCRText = ocrText
		s.ocrMu.Unlock()
		s.log.GetLogger().Infof("QuickReport: OCR OK, %d chars, cached with Email ID %d", len(ocrText), id)
		return ocrText
	} else if geminiErr != nil {
		s.log.GetLogger().Warnf("Gemini OCR failed: %v", geminiErr)
	}

	return ""
}

func (s *service) extractReportLink(resp string) string {
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

func (s *service) GenerateQuickReportText(ctx context.Context, userID string) (string, error) {
	if s.geminiSvc == nil {
		return "", fmt.Errorf("Gemini AI service is not initialized")
	}

	now := time.Now()
	reportTime := now.Format("15h04")
	reportDate := now.Format("02/01/2006")

	g, gCtx := errgroup.WithContext(ctx)

	// 1. Fetch Rain Summary
	var rainSum *weather.RainSummaryData
	g.Go(func() error {
		var err error
		rainSum, err = s.weatherSvc.GetRainSummary(gCtx, "", nil)
		return err
	})

	// 2. Fetch Inundation Summary
	inundationInfo := "Trên các tuyến đường an toàn, không xảy ra úng ngập"
	g.Go(func() error {
		if inundationSummary, err := s.inuSvc.GetInundationSummary(gCtx, "", true, nil); err == nil && inundationSummary != nil {
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

	err := g.Wait()
	if err != nil {
		return "", err
	}

	if rainSum == nil || rainSum.RainyStations == 0 {
		report := fmt.Sprintf("Công ty Thoát nước Hà Nội báo cáo UBND Thành phố tình hình PCUN đô thị thời điểm: “%s ngày %s”: Hiện tại trên địa bàn Thành phố không có mưa; %s. Công ty sẽ tiếp tục theo dõi và báo cáo khi có diễn biến mới. Trân trọng./.", reportTime, reportDate, inundationInfo)

		if s.aiChatLogRepo != nil && userID != "" {
			now := time.Now()
			_ = s.aiChatLogRepo.Save(ctx, &models.AiChatLog{
				UserID: userID, Role: "user", Content: "Báo cáo nhanh (Văn bản)", ChatType: "support", Timestamp: now.Add(-1 * time.Second),
			})
			_ = s.aiChatLogRepo.Save(ctx, &models.AiChatLog{
				UserID: userID, Role: "model", Content: report, ChatType: "support", Timestamp: now,
			})
		}
		return report, nil
	}

	rainStartTime := "rạng sáng"
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

	for _, m := range rainSum.Measurements {
		tBD := parseT(m.StartTimeFull)
		tHT := parseT(m.EndTimeFull)
		if !tBD.IsZero() && (minStart.IsZero() || tBD.Before(minStart)) {
			minStart = tBD
		}
		if !tHT.IsZero() && (maxEnd.IsZero() || tHT.After(maxEnd)) {
			maxEnd = tHT
		}
	}

	if !minStart.IsZero() {
		rainStartTime = minStart.Format("15h04")
	}

	rainEndTime := "thời điểm hiện tại"
	if !maxEnd.IsZero() && time.Since(maxEnd) > 5*time.Minute {
		rainEndTime = maxEnd.Format("15h04")
	}

	rainIntensity := "nhỏ"
	if rainSum.MaxRainStation.TotalRain > 100 {
		rainIntensity = "rất lớn"
	} else if rainSum.MaxRainStation.TotalRain > 50 {
		rainIntensity = "lớn"
	}
	rainSpread := rainSum.RainyStations > 20

	rawSummary := fmt.Sprintf(`- Thời điểm báo cáo: %s ngày %s
- Thời điểm bắt đầu mưa: %s
- Thời điểm kết thúc mưa: %s
- Cường độ mưa: %s
- Diện mưa: %v (%d điểm đo)
- Lượng mưa phổ biến: %.1f đến %.1f mm
- Điểm mưa lớn nhất: %s (%.1f mm)
- Tình trạng úng ngập: %s
- Công tác triển khai: Các trạm bơm Yên Sở, Cổ Nhuế, Đồng Bông 1, Hầm chui... vận hành từ khi xuất hiện mưa để hạ mực nước hệ thống, đảm bảo giao thông.`,
		reportTime, reportDate, rainStartTime, rainEndTime, rainIntensity, map[bool]string{true: "diện rộng", false: "diện hẹp"}[rainSpread], rainSum.RainyStations, 0.0, rainSum.MaxRainStation.TotalRain, rainSum.MaxRainStation.Name, rainSum.MaxRainStation.TotalRain, inundationInfo)

	prompt := fmt.Sprintf(`Vai trò: Trợ lý tổng hợp báo cáo kỹ thuật. 
Nhiệm vụ: Dựa vào DỮ LIỆU THÔ bên dưới, hãy viết lại thành một đoạn văn báo cáo CHÍNH XÁC theo MẪU BÁO CÁO yêu cầu.

DỮ LIỆU THÔ:
[%s]

MẪU BÁO CÁO YÊU CẦU:
Công ty Thoát nước Hà Nội báo cáo UBND Thành phố tình hình PCUN đô thị thời điểm: “[Giờ] ngày [Ngày]”: Trên địa bàn thành phố xuất hiện mưa từ [Thời điểm bắt đầu mưa] đến [Thời điểm kết thúc mưa]. Mưa cường độ [Cường độ mưa], [Diện rộng hay hẹp], lượng mưa phổ biến [Số mm] đến [Số mm]mm, riêng khu vực: [Tên trạm/phường lớn nhất] có lượng mưa lớn hơn [Số mm]mm; [Tình trạng úng ngập]; Công ty Thoát nước Hà Nội đã triển khai ứng trực tại các vị trí có khả năng ngập từ [Thời điểm bắt đầu mưa]; các trạm bơm Yên Sở, cổ nhuế, đồng bông 1, hầm chui... vận hành từ khi xuất hiện mưa để hạ mực nước hệ thống, đảm bảo giao thông ở hầm chui, các cửa phai vận hành theo quy định. Công ty sẽ tiếp tục báo cáo khi có diễn biến mưa trong thời gian tới. TRân trọng./.`, rawSummary)

	aiResult, _ := s.geminiSvc.Chat(ctx, prompt, nil, userID, true, "Báo cáo nhanh (Văn bản)")
	return aiResult, nil
}

func (s *service) GenerateAIDynamicReport(ctx context.Context, userID string) (string, error) {
	if s.geminiSvc == nil {
		return "", fmt.Errorf("Gemini AI service is not initialized")
	}

	now := time.Now()
	g, gCtx := errgroup.WithContext(ctx)

	emailContent := ""
	g.Go(func() error {
		emailContent = s.getLatestOCRText(gCtx)
		return nil
	})

	var rainSum *weather.RainSummaryData
	g.Go(func() error {
		var err error
		rainSum, err = s.weatherSvc.GetRainSummary(gCtx, "", nil)
		return err
	})

	waterSummaryStr := ""
	g.Go(func() error {
		summary, err := s.waterSvc.GetWaterSummary(gCtx, "", nil)
		if err != nil || summary == nil {
			return nil
		}
		var lakelines, riverlines []string
		for _, it := range summary.LakeStations {
			lakelines = append(lakelines, fmt.Sprintf("  - %s: %.2fm", it.Name, it.Level/100.0))
		}
		for _, it := range summary.RiverStations {
			riverlines = append(riverlines, fmt.Sprintf("  - %s: %.2fm", it.Name, it.Level/100.0))
		}
		var parts []string
		if len(lakelines) > 0 {
			parts = append(parts, fmt.Sprintf("Hồ (%d trạm):\n%s", len(lakelines), strings.Join(lakelines, "\n")))
		}
		if len(riverlines) > 0 {
			parts = append(parts, fmt.Sprintf("Sông (%d trạm):\n%s", len(riverlines), strings.Join(riverlines, "\n")))
		}
		waterSummaryStr = strings.Join(parts, "\n\n")
		return nil
	})

	inundationSummaryStr := ""
	g.Go(func() error {
		summary, err := s.inuSvc.GetInundationSummary(gCtx, "", true, nil)
		if err != nil || summary == nil {
			inundationSummaryStr = "Không có dữ liệu."
			return nil
		}
		if summary.ActivePoints == 0 {
			inundationSummaryStr = "Hiện tại không có điểm ngập nào trên toàn thành phố."
			return nil
		}
		var details []string
		for _, pt := range summary.OngoingPoints {
			depth := pt.Length + "x" + pt.Width + "x" + pt.Depth
			if depth == "" {
				depth = "chưa rõ"
			}
			details = append(details, fmt.Sprintf("  - %s (ngập %s, XN quản lý: %s)", pt.StreetName, depth, pt.OrgName))
		}
		inundationSummaryStr = fmt.Sprintf("Tổng số điểm đang ngập: %d\nChi tiết:\n%s", summary.ActivePoints, strings.Join(details, "\n"))
		return nil
	})

	pumpingSummaryStr := ""
	g.Go(func() error {
		summary, err := s.pumpingSvc.GetPumpingStationSummary(gCtx, "", nil)
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

	rainSummaryCombined := rainIntro + "\n"
	if rainSum != nil && len(rainSum.Measurements) > 0 {
		var lines []string
		for _, m := range rainSum.Measurements {
			status := "Đang mưa"
			if !m.IsRaining {
				status = fmt.Sprintf("Đã tạnh lúc %s", m.EndTime)
			}
			lines = append(lines, fmt.Sprintf("  - %s: %.1fmm (%s)", m.Name, m.TotalRain, status))
		}
		rainSummaryCombined += strings.Join(lines, "\n")
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
		rainSummaryCombined, waterSummaryStr, inundationSummaryStr, pumpingSummaryStr, emailSection)

	aiResult, err := s.geminiSvc.Chat(ctx, prompt, nil, userID, true, "Tổng hợp tình hình hệ thống")
	return aiResult, err
}
