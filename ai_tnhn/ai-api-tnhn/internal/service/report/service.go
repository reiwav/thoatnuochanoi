package report

import (
	"ai-api-tnhn/config"
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/google/googleapi"
	"ai-api-tnhn/internal/service/google/googledrive"
	"ai-api-tnhn/internal/service/weather"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
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
	googleSvc     googleapi.Service
	driveSvc      googledrive.Service
	aiChatLogRepo repository.AiChatLog
}

func NewService(cfg *config.Config, log logger.Logger, googleSvc googleapi.Service, driveSvc googledrive.Service, aiChatLogRepo repository.AiChatLog) Service {
	return &service{
		cfg:           cfg,
		log:           log,
		googleSvc:     googleSvc,
		driveSvc:      driveSvc,
		aiChatLogRepo: aiChatLogRepo,
	}
}

// ----------------------------------------------------------------------------
// API Wrappers
// ----------------------------------------------------------------------------

func (s *service) GenerateQuickReportText(ctx context.Context, userID string) (string, error) {
	return s.googleSvc.GenerateAIReport(ctx, "viber", userID)
}

func (s *service) GenerateAIDynamicReport(ctx context.Context, userID string) (string, error) {
	return s.googleSvc.GenerateAIReport(ctx, "dynamic", userID)
}

// ----------------------------------------------------------------------------
// Word Report Generation (V3)
// ----------------------------------------------------------------------------

func (s *service) GenerateQuickReportV3(ctx context.Context, userID string) (*QuickReportResult, error) {
	if s.driveSvc == nil { return nil, fmt.Errorf("Google Drive service not initialized") }

	now := time.Now()
	dd, mm, yyyy, hh, shortHour := now.Format("02"), now.Format("01"), now.Format("2006"), now.Format("15h04"), now.Format("15h")

	city, err := s.googleSvc.GetCityStatus(ctx)
	if err != nil { return nil, fmt.Errorf("failed to fetch city status: %w", err) }

	lakeDataRaw, riverDataRaw := [][]string{{"Hồ", "Mực nước"}}, [][]string{{"Sông", "Mực nước"}}
	phuongDataRaw, xaDataRaw := [][]string{{"Phường", "Lượng mưa (mm)"}}, [][]string{{"Xã", "Lượng mưa (mm)"}}

	riverConfigs := []struct{ id, name string }{
		{"3", "Sông Tô Lịch (Đập Thanh Liệt)"}, {"170", "Sông Nhuệ (Cống Hà Đông)"}, {"4", "Sông Tô Lịch (Hoàng Quốc Việt)"}, 
		{"23", "Sông Kim Ngưu (Cống Lò Đúc)"}, {"28", "Sông Lừ -HL CĐT Lừ Sét"},
	}
	lakeConfigs := []struct{ id, name string }{
		{"35", "Hồ Hoàn Kiếm"}, {"33", "Hồ Tây A TL"}, {"39", "Hồ Linh Đàm"}, {"40", "Hồ Đống Đa"}, {"42", "Hồ Định Công"},
	}

	if city.RawWater != nil {
		wMap := make(map[string]float64)
		for _, d := range city.RawWater.Content.Data { wMap[d.TramId] = d.ThuongLuu_HT }
		for _, cfg := range lakeConfigs { lakeDataRaw = append(lakeDataRaw, []string{cfg.name, fmt.Sprintf("%.2fm", wMap[cfg.id]/100.0)}) }
		for _, cfg := range riverConfigs { riverDataRaw = append(riverDataRaw, []string{cfg.name, fmt.Sprintf("%.2fm", wMap[cfg.id]/100.0)}) }
	}

	phuongs, xas := s.mapRainData(city.Weather)
	for _, v := range phuongs { phuongDataRaw = append(phuongDataRaw, []string{v.name, fmt.Sprintf("%.1f", v.val)}) }
	for _, v := range xas { xaDataRaw = append(xaDataRaw, []string{v.name, fmt.Sprintf("%.1f", v.val)}) }

	timeMua := s.formatRainTime(city.Weather)
	noidung, _ := s.googleSvc.GenerateAIReport(ctx, "active_rain", userID)
	if noidung == "" { noidung = "Báo cáo tình hình mưa" }

	motaUngNgap, chiTietCacDiem, soLuongUngNgap := "không xuất hiện điểm úng ngập", "", 0
	if city.Inundation != nil {
		soLuongUngNgap = city.Inundation.ActivePoints
		motaUngNgap = city.Inundation.SummaryText
		chiTietCacDiem = city.Inundation.FullSummary
	}

	noiDungTramBom := "Hiện tại không ghi nhận trạm bơm nào đang vận hành."
	if city.Pumping != nil { noiDungTramBom = city.Pumping.SummaryText }

	splitTable := func(data [][]string) ([][]string, [][]string) {
		if len(data) <= 1 {
			if len(data) == 1 { return data, [][]string{data[0]} }
			return [][]string{}, [][]string{}
		}
		h, items := data[0], data[1:]
		half := (len(items) + 1) / 2
		return append([][]string{h}, items[:half]...), append([][]string{h}, items[half:]...)
	}

	phuong1, phuong2 := splitTable(phuongDataRaw)
	xa1, xa2 := splitTable(xaDataRaw)

	hienTrangMua := "không còn mưa"
	if city.Weather != nil && city.Weather.RainyStations > 0 { hienTrangMua = "tiếp tục có mưa" }

	payload := map[string]interface{}{
		"dd": dd, "mm": mm, "yyyy": yyyy, "hh": hh, "noidung": noidung, "time_mua": timeMua,
		"so_luong_ung_ngap": soLuongUngNgap, "mo_ta_ung_ngap": motaUngNgap, "chi_tiet_cac_diem": chiTietCacDiem,
		"hien_trang_mua": hienTrangMua, "noi_dung_tram_bom": noiDungTramBom,
		"table1_mua_phuong": phuong1, "table2_mua_phuong": phuong2, "table1_mua_xa": xa1, "table2_mua_xa": xa2,
		"table_song": riverDataRaw, "table_ho": lakeDataRaw,
	}

	targetFilename := fmt.Sprintf("Bao cao mua ngay %s-%s-%s thoi diem %s.docx", dd, mm, yyyy, shortHour)
	localTemplate := filepath.Join("doc", "Bao cao mua ngay {dd}-{mm}-{yyyy} thoi diem {hh}.docx")
	fileData, err := os.Open(localTemplate)
	if err != nil { return nil, fmt.Errorf("template document not found") }
	defer fileData.Close()

	folderID, _ := s.driveSvc.FindOrCreateFolder(ctx, s.cfg.GoogleDriveConfig.RootFolderID, "REPORTS")
	if folderID == "" { folderID = s.cfg.GoogleDriveConfig.RootFolderID }

	templateID, err := s.driveSvc.UploadFile(ctx, folderID, targetFilename, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", fileData, true)
	if err != nil { return nil, fmt.Errorf("failed to upload template: %w", err) }

	resp, err := s.driveSvc.TriggerReportGeneration(ctx, s.cfg.GoogleDriveConfig.AppsScriptWebhookURL, templateID, folderID, payload)
	if err != nil { return nil, fmt.Errorf("failed to trigger Apps Script: %w", err) }

	resLink := s.extractReportLink(resp)
	if resLink == "" { resLink = fmt.Sprintf("https://docs.google.com/document/d/%s/edit", templateID) }

	if s.aiChatLogRepo != nil && userID != "" {
		_ = s.aiChatLogRepo.Save(ctx, &models.AiChatLog{UserID: userID, Role: "user", Content: "Tạo báo cáo nhanh", ChatType: "support", Timestamp: time.Now().Add(-1 * time.Second)})
		_ = s.aiChatLogRepo.Save(ctx, &models.AiChatLog{UserID: userID, Role: "model", Content: fmt.Sprintf("Đã tạo xong báo cáo nhanh! Bạn có thể xem và tải về tại đây:\n%s", resLink), ChatType: "support", Timestamp: time.Now()})
	}
	return &QuickReportResult{ReportURL: resLink, DocID: templateID}, nil
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

type itemVal struct { name string; val float64 }

func (s *service) mapRainData(rainSum *weather.RainSummaryData) (phuongs []itemVal, xas []itemVal) {
	if rainSum == nil { return }
	fixedXas := []string{"Xã Tân Triều", "Xã Thanh Liệt", "Xã Vĩnh Quỳnh", "Xã Tam Hiệp", "Xã Tứ Hiệp", "Xã Ngũ Hiệp", "Xã Vạn Phúc", "Xã Hữu Hòa", "Xã Tả Thanh Oai", "Xã Đại Áng"}
	anyXaRain := false
	for _, m := range rainSum.Measurements {
		if strings.Contains(strings.ToLower(m.Name), "xã") {
			xas = append(xas, itemVal{m.Name, m.TotalRain})
			if m.TotalRain > 0 { anyXaRain = true }
		} else { phuongs = append(phuongs, itemVal{m.Name, m.TotalRain}) }
	}
	sort.Slice(phuongs, func(i, j int) bool { return phuongs[i].val > phuongs[j].val })
	if len(phuongs) > 10 { phuongs = phuongs[:10] }

	if anyXaRain {
		m := make(map[string]float64)
		for _, x := range xas { m[x.name] = x.val }
		xas = []itemVal{}
		for _, n := range fixedXas { xas = append(xas, itemVal{n, m[n]}) }
	} else {
		sort.Slice(xas, func(i, j int) bool { return xas[i].val > xas[j].val })
		if len(xas) > 10 { xas = xas[:10] }
	}
	return
}

func (s *service) formatRainTime(rainSum *weather.RainSummaryData) string {
	if rainSum == nil || rainSum.StartTimeFull.IsZero() || rainSum.EndTimeFull.IsZero() { return "" }
	return fmt.Sprintf("%s đến %s", rainSum.StartTimeFull.Format("15h04'"), rainSum.EndTimeFull.Format("15h04'"))
}

func (s *service) extractReportLink(resp string) string {
	var data map[string]interface{}
	if err := json.Unmarshal([]byte(resp), &data); err != nil { return "" }
	keys := []string{"newDocId", "docID", "docId", "file_id", "fileId"}
	for _, k := range keys {
		if v, ok := data[k].(string); ok && v != "" { return fmt.Sprintf("https://docs.google.com/document/d/%s/edit", v) }
	}
	if nested, ok := data["data"].(map[string]interface{}); ok {
		for _, k := range keys {
			if v, ok := nested[k].(string); ok && v != "" { return fmt.Sprintf("https://docs.google.com/document/d/%s/edit", v) }
		}
		urlKeys := []string{"report_url", "file_url", "report_link", "fileUrl"}
		for _, k := range urlKeys {
			if v, ok := nested[k].(string); ok && v != "" { return v }
		}
	}
	urlKeys := []string{"report_url", "file_url", "fileUrl", "report_link"}
	for _, k := range urlKeys {
		if v, ok := data[k].(string); ok && v != "" { return v }
	}
	return ""
}
