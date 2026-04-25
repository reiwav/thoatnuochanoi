package googleapi

import (
	"ai-api-tnhn/internal/constant"
	"ai-api-tnhn/internal/service/google/gemini/promt"
	"context"
	"fmt"
	"time"
)

func (s *service) GenerateAIReport(ctx context.Context, reportType string, userID string) (string, error) {
	if s.geminiSvc == nil {
		return "", fmt.Errorf("gemini service is not initialized")
	}

	status, err := s.GetCityStatus(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get city status: %w", err)
	}

	now := time.Now()
	dd, mm, yyyy := now.Format("02"), now.Format("01"), now.Format("2006")
	hh := now.Format("15h04")

	var prompt string
	switch reportType {
	case constant.ReportTypeActiveRain:
		prompt = s.buildActiveRainPrompt(status, hh, dd, mm, yyyy)
	case constant.ReportTypeViber:
		prompt = s.buildViberPrompt(status, hh, dd, mm, yyyy)
	case constant.ReportTypeDynamic:
		prompt = s.buildDynamicPrompt(status, hh, dd, mm, yyyy)
	default:
		return "", fmt.Errorf("unsupported report type: %s", reportType)
	}

	return s.geminiSvc.Chat(ctx, prompt, nil, userID, true, constant.LogPrefixGenerateReport+reportType)
}

func (s *service) buildActiveRainPrompt(status *CityStatus, hh, dd, mm, yyyy string) string {
	soDiemMua := 0
	hasRain := false
	if status.Weather != nil {
		soDiemMua = status.Weather.RainyStations
		for _, m := range status.Weather.Measurements {
			if m.TotalRain > 0 {
				hasRain = true
				break
			}
		}
	}

	if soDiemMua == 0 && hasRain {
		return fmt.Sprintf(promt.Get("report_rain_stopped"), status.OCRText, hh, dd, mm, yyyy)
	} else if soDiemMua == 0 {
		return fmt.Sprintf(promt.Get("report_no_rain"), status.OCRText, hh, dd, mm, yyyy)
	}
	return fmt.Sprintf(promt.Get("report_active_rain"), status.OCRText, soDiemMua, hh, dd, mm, yyyy)
}

func (s *service) buildViberPrompt(status *CityStatus, hh, dd, mm, yyyy string) string {
	if status.Weather == nil { return "" }
	rainStartTime, rainEndTime := "rạng sáng", "thời điểm hiện tại"

	if !status.Weather.StartTimeFull.IsZero() { rainStartTime = status.Weather.StartTimeFull.Format("15h04") }
	if !status.Weather.EndTimeFull.IsZero() && time.Since(status.Weather.EndTimeFull) > 5*time.Minute {
		rainEndTime = status.Weather.EndTimeFull.Format("15h04")
	}

	rainIntensity := "nhỏ"
	if status.Weather.MaxRainStation.TotalRain > 100 { rainIntensity = "rất lớn" 
	} else if status.Weather.MaxRainStation.TotalRain > 50 { rainIntensity = "lớn" }
	
	rainSpread := "diện hẹp"
	if status.Weather.RainyStations > 20 { rainSpread = "diện rộng" }

	inuInfo := "Trên các tuyến đường an toàn, không xảy ra úng ngập"
	if status.Inundation != nil && status.Inundation.ActivePoints > 0 {
		inuInfo = status.Inundation.SummaryText + ": " + status.Inundation.FullSummary
	}

	rawSummary := fmt.Sprintf(`- Thời điểm báo cáo: %s ngày %s/%s/%s
- Thời điểm bắt đầu mưa: %s
- Thời điểm kết thúc mưa: %s
- Cường độ mưa: %s
- Diện mưa: %s (%d điểm đo)
- Lượng mưa phổ biến: 0.0 đến %.1f mm
- Điểm mưa lớn nhất: %s (%.1f mm)
- Tình trạng úng ngập: %s`,
		hh, dd, mm, yyyy, rainStartTime, rainEndTime, rainIntensity, rainSpread, status.Weather.RainyStations, 
		status.Weather.MaxRainStation.TotalRain, status.Weather.MaxRainStation.Name, status.Weather.MaxRainStation.TotalRain, inuInfo)

	return fmt.Sprintf(promt.Get("report_viber"), rawSummary)
}

func (s *service) buildDynamicPrompt(status *CityStatus, hh, dd, mm, yyyy string) string {
	rainIntro := "Hiện tại trên địa bàn thành phố không ghi nhận điểm mưa nào."
	if status.Weather != nil { rainIntro = status.Weather.SummaryText }

	waterStr := "Hiện tại mực nước trên hệ thống đang ở mức an toàn."
	if status.Water != nil && status.Water.SummaryText != "" { waterStr = status.Water.SummaryText }

	inuStr := "An toàn, không ngập."
	if status.Inundation != nil {
		inuStr = status.Inundation.FullSummary
		if inuStr == "" { inuStr = status.Inundation.SummaryText }
	}
	pumpStr := "Hiện tại không ghi nhận trạm bơm nào đang vận hành."
	if status.Pumping != nil { pumpStr = status.Pumping.SummaryText }

	return fmt.Sprintf(promt.Get("report_dynamic"), hh, dd+"/"+mm+"/"+yyyy, rainIntro, waterStr, inuStr, pumpStr)
}
