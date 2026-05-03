package report

import (
	"ai-api-tnhn/internal/constant"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/weather"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

func (s *service) GenerateQuickReportText(ctx context.Context, userID string) (string, error) {
	return s.googleSvc.GenerateAIReport(ctx, constant.ReportTypeViber, userID)
}

func (s *service) GenerateAIDynamicReport(ctx context.Context, userID string) (string, error) {
	return s.googleSvc.GenerateAIReport(ctx, constant.ReportTypeDynamic, userID)
}

func (s *service) GenerateQuickReportV3(ctx context.Context, userID string) (*QuickReportResult, error) {
	if s.driveSvc == nil {
		return nil, fmt.Errorf("Google Drive service not initialized")
	}

	now := time.Now()
	dd, mm, yyyy, hh, shortHour := now.Format("02"), now.Format("01"), now.Format("2006"), now.Format("15h04"), now.Format("15h")

	city, err := s.googleSvc.GetCityStatus(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch city status: %w", err)
	}

	lakeDataRaw, riverDataRaw := [][]string{{"Hồ", "Mực nước"}}, [][]string{{"Sông", "Mực nước"}}
	phuongDataRaw, xaDataRaw := [][]string{{"Phường", "Lượng mưa (mm)"}}, [][]string{{"Xã", "Lượng mưa (mm)"}}

	// 1. Lấy và Map dữ liệu trạm Sông
	var rivers []*models.RiverStation
	_ = s.riverStationRepo.R_SelectManyWithSort(ctx, bson.M{"trong_so_bao_cao": bson.M{"$gt": 0}}, bson.M{"trong_so_bao_cao": 1}, &rivers)

	// 2. Lấy và Map dữ liệu trạm Hồ
	var lakes []*models.LakeStation
	_ = s.lakeStationRepo.R_SelectManyWithSort(ctx, bson.M{"trong_so_bao_cao": bson.M{"$gt": 0}}, bson.M{"trong_so_bao_cao": 1}, &lakes)

	if city.RawWater != nil {
		wMap := make(map[int]float64)
		for _, d := range city.RawWater.Content.Data {
			idInt := 0
			fmt.Sscanf(d.TramId, "%d", &idInt)
			wMap[idInt] = d.ThuongLuu_HT
		}
		for _, r := range rivers {
			riverDataRaw = append(riverDataRaw, []string{r.TenTram, fmt.Sprintf("%.2fm", wMap[r.OldID]/100.0)})
		}
		for _, l := range lakes {
			lakeDataRaw = append(lakeDataRaw, []string{l.TenTram, fmt.Sprintf("%.2fm", wMap[l.OldID]/100.0)})
		}
	}

	// 3. Lấy và Map dữ liệu trạm Mưa (Phường/Xã)
	var rainStations []*models.RainStation
	_ = s.rainStationRepo.R_SelectManyWithSort(ctx, bson.M{}, bson.M{"trong_so_bao_cao": 1}, &rainStations)

	if city.Weather != nil {
		mMap := make(map[int]float64)
		for _, m := range city.Weather.Measurements {
			mMap[m.ID] = m.TotalRain
		}

		for _, rs := range rainStations {
			if totalRain, ok := mMap[rs.OldID]; ok && totalRain > 0 {
				row := []string{rs.TenPhuong, fmt.Sprintf("%.1f", totalRain)}
				if rs.Loai == models.StationAreaXa {
					xaDataRaw = append(xaDataRaw, row)
				} else {
					phuongDataRaw = append(phuongDataRaw, row)
				}
			}
		}
	}

	timeMua := s.formatRainTime(city.Weather)
	noidung, _ := s.googleSvc.GenerateAIReport(ctx, constant.ReportTypeActiveRain, userID)
	if noidung == "" {
		noidung = "Báo cáo tình hình mưa"
	}

	motaUngNgap, chiTietCacDiem, soLuongUngNgap := "không xuất hiện điểm úng ngập", "", 0
	if city.Inundation != nil {
		soLuongUngNgap = city.Inundation.ActivePoints
		motaUngNgap = city.Inundation.SummaryText
		chiTietCacDiem = city.Inundation.FullSummary
	}

	noiDungTramBom := "Hiện tại không ghi nhận trạm bơm nào đang vận hành."
	if city.Pumping != nil {
		noiDungTramBom = city.Pumping.SummaryPriorityText
	}

	splitTable := func(data [][]string) ([][]string, [][]string) {
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

	phuong1, phuong2 := splitTable(phuongDataRaw)
	xa1, xa2 := splitTable(xaDataRaw)

	hienTrangMua := "không còn mưa"
	if city.Weather != nil && city.Weather.RainyStations > 0 {
		hienTrangMua = "tiếp tục có mưa"
	}

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

func (s *service) formatRainTime(rainSum *weather.RainSummaryData) string {
	if rainSum == nil || rainSum.StartTimeFull.IsZero() || rainSum.EndTimeFull.IsZero() {
		return ""
	}
	return fmt.Sprintf("%s đến %s", rainSum.StartTimeFull.Format("15h04'"), rainSum.EndTimeFull.Format("15h04'"))
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
