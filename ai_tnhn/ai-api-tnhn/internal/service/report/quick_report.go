package report

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/utils"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

func (s *service) GenerateQuickReportV3(ctx context.Context, userID string, customTime *time.Time) (*QuickReportResult, error) {
	if s.driveSvc == nil {
		return nil, fmt.Errorf("Google Drive service not initialized")
	}

	now := time.Now()
	dd, mm, yyyy, hh, shortHour := now.Format("02"), now.Format("01"), now.Format("2006"), now.Format("15h04"), now.Format("15h")

	city, err := s.googleSvc.GetCityStatus(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch city status: %w", err)
	}

	nowInLoc := utils.NowVietnam()
	loc := utils.VietnamLocation

	var rainStartTime time.Time
	if city.Weather != nil && !city.Weather.StartTimeFull.IsZero() {
		rainStartTime = city.Weather.StartTimeFull.In(loc)
	} else {
		rainStartTime = time.Date(nowInLoc.Year(), nowInLoc.Month(), nowInLoc.Day(), 7, 0, 0, 0, loc)
	}

	// 1. Build Water tables (River and Lake)
	waterTables := s.buildWaterStationTables(ctx, city, rainStartTime, nowInLoc, loc, customTime)

	// 2. Build Rain tables (Phuong and Xa)
	rainTables := s.buildRainStationTables(ctx, city)

	timeMua := s.formatRainTime(city.Weather)

	// 3. Build Pumping data
	pumpingData := s.buildPumpingReportData(city)

	// 4. Parse AI summary & Fallbacks
	noidung, motaUngNgap, chiTietCacDiem, aiNoiDungTramBom := s.parseAIReportSummary(ctx, userID, city)
	if aiNoiDungTramBom != "" {
		pumpingData.NoiDungTramBom = aiNoiDungTramBom
	}

	soLuongUngNgap := 0
	if city.Inundation != nil {
		soLuongUngNgap = city.Inundation.ActivePoints
	}

	hienTrangMua := "không còn mưa"
	if city.Weather != nil && city.Weather.RainyStations > 0 {
		hienTrangMua = "tiếp tục có mưa"
	}

	payload := map[string]interface{}{
		"dd": dd, "mm": mm, "yyyy": yyyy, "hh": hh, "noidung": noidung, "time_mua": timeMua,
		"time_truoc_mua": rainStartTime.Format("15h04"),
		"so_luong_ung_ngap": soLuongUngNgap, "mo_ta_ung_ngap": motaUngNgap, "chi_tiet_cac_diem": chiTietCacDiem,
		"hien_trang_mua": hienTrangMua, "noi_dung_tram_bom": pumpingData.NoiDungTramBom,
		"danh_sach_tram_bom": pumpingData.DanhSachTramBom,

		// Phụ lục
		"phu_luc_table_mua_phuong": rainTables.AllPhuongDataRaw,
		"phu_luc_table_mua_xa":     rainTables.AllXaDataRaw,
		"phu_luc_table_song":       waterTables.AllRiverDataRaw,
		"phu_luc_table_ho":         waterTables.AllLakeDataRaw,
	}

	targetFilename := fmt.Sprintf("Bao cao mua ngay %s-%s-%s thoi diem %s.docx", dd, mm, yyyy, shortHour)
	localTemplate := filepath.Join("doc", "Bao cao mua ngay {dd}-{mm}-{yyyy} thoi diem {hh}.docx")
	fileData, err := os.Open(localTemplate)
	if err != nil {
		return nil, fmt.Errorf("template document not found")
	}
	defer fileData.Close()

	folderID, _ := s.driveSvc.FindOrCreateFolder(ctx, s.cfg.GoogleDriveConfig.RootFolderID, "REPORTS")
	if folderID == "" {
		folderID = s.cfg.GoogleDriveConfig.RootFolderID
	}

	templateID, err := s.driveSvc.UploadFile(ctx, folderID, targetFilename, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", fileData, true)
	if err != nil {
		return nil, fmt.Errorf("failed to upload template: %w", err)
	}
	jsonBytes, _ := json.Marshal(payload)
	fmt.Println("======================", string(jsonBytes))
	resp, err := s.driveSvc.TriggerReportGeneration(ctx, s.cfg.GoogleDriveConfig.AppsScriptWebhookURL, templateID, folderID, payload)
	if err != nil {
		return nil, fmt.Errorf("failed to trigger Apps Script: %w", err)
	}

	resLink := s.extractReportLink(resp)
	if resLink == "" {
		resLink = fmt.Sprintf("https://docs.google.com/document/d/%s/edit", templateID)
	}

	if s.aiChatLogRepo != nil && userID != "" {
		_ = s.aiChatLogRepo.Save(ctx, &models.AiChatLog{UserID: userID, Role: "user", Content: "Tạo báo cáo nhanh", ChatType: "support", Timestamp: time.Now().Add(-1 * time.Second)})
		_ = s.aiChatLogRepo.Save(ctx, &models.AiChatLog{UserID: userID, Role: "model", Content: fmt.Sprintf("Đã tạo xong báo cáo nhanh! Bạn có thể xem và tải về tại đây:\n%s", resLink), ChatType: "support", Timestamp: time.Now()})
	}
	return &QuickReportResult{ReportURL: resLink, DocID: templateID}, nil
}

func splitTable(data [][]string) ([][]string, [][]string) {
	if len(data) <= 1 {
		if len(data) == 1 {
			return data, [][]string{data[0]}
		}
		return [][]string{}, [][]string{}
	}
	h, items := data[0], data[1:]
	half := (len(items) + 1) / 2
	return append([][]string{h}, items[:half]...), append([][]string{h}, items[half:]...)
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
