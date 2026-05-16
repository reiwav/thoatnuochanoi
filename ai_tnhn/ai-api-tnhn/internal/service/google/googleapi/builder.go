package googleapi

import (
	"ai-api-tnhn/internal/service/google/gemini/promt"
	"fmt"
	"strings"
	"time"
)

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
	if status.Weather == nil {
		return ""
	}

	// No rain and no inundation: simple "no rain" prompt
	if status.Weather.RainyStations == 0 && status.Weather.MaxRainStation.TotalRain == 0 &&
		(status.Inundation == nil || (status.Inundation.ActivePoints == 0 && len(status.Inundation.OngoingPoints) == 0)) {
		return fmt.Sprintf(promt.Get("report_no_rain"), status.OCRText, hh, dd, mm, yyyy)
	}

	// If there is rain or inundation, provide raw data to AI for analysis
	var data []string
	data = append(data, fmt.Sprintf("ReportTime: %s %s/%s/%s", hh, dd, mm, yyyy))

	if status.Weather != nil {
		hasRainedToday := status.Weather.MaxRainStation.TotalRain > 0
		isCurrentlyRaining := status.Weather.RainyStations > 0

		if !hasRainedToday {
			data = append(data, "RainStatus: No rain recorded today")
			data = append(data, "RainStart: -")
			data = append(data, "RainEnd: -")
			data = append(data, "RainIntensity: none")
			data = append(data, "RainSpread: none")
			data = append(data, "CommonRainRange: 0 mm")
			data = append(data, "MaxRain: none")
		} else {
			if isCurrentlyRaining {
				data = append(data, "RainStatus: Currently raining")
			} else {
				data = append(data, "RainStatus: Rain has stopped")
			}

			rainStartTime, rainEndTime := "early morning", "current"
			if !status.Weather.StartTimeFull.IsZero() {
				rainStartTime = status.Weather.StartTimeFull.Format("15h04")
			}
			if !status.Weather.EndTimeFull.IsZero() && time.Since(status.Weather.EndTimeFull) > 5*time.Minute {
				rainEndTime = status.Weather.EndTimeFull.Format("15h04")
			}

			data = append(data, fmt.Sprintf("RainStart: %s", rainStartTime))
			data = append(data, fmt.Sprintf("RainEnd: %s", rainEndTime))
			data = append(data, fmt.Sprintf("RainyStations: %d", status.Weather.RainyStations))
			data = append(data, fmt.Sprintf("MaxRain: %s (%.1f mm)", status.Weather.MaxRainStation.Name, status.Weather.MaxRainStation.TotalRain))

			// Common rain range calculation
			var sum float64
			var count int
			for _, m := range status.Weather.Measurements {
				if m.TotalRain > 0 {
					sum += m.TotalRain
					count++
				}
			}
			avgRain := 0.0
			if count > 0 {
				avgRain = sum / float64(count)
			}
			data = append(data, fmt.Sprintf("CommonRainRange: %.1f to %.1f mm", avgRain, status.Weather.MaxRainStation.TotalRain))
		}
	}

	if status.Inundation != nil {
		data = append(data, fmt.Sprintf("InundationPoints: %d", status.Inundation.ActivePoints))
		var inuDetails []string
		for _, p := range status.Inundation.OngoingPoints {
			// Clean street name as requested: remove "(đoạn thuộc phạm vi phường)"
			cleanName := strings.ReplaceAll(p.StreetName, " (đoạn thuộc phạm vi phường)", "")
			cleanName = strings.ReplaceAll(cleanName, "(đoạn thuộc phạm vi phường)", "")
			cleanName = strings.TrimSpace(cleanName)

			dim := fmt.Sprintf("%v x %v x %.2f", p.Length, p.Width, p.Depth)
			if p.Length == "" && p.Width == "" && p.Depth == 0 {
				inuDetails = append(inuDetails, cleanName)
			} else {
				// Format exactly as requested: Street Name (D x R x S)
				inuDetails = append(inuDetails, fmt.Sprintf("%s (%s)", cleanName, dim))
			}
		}
		data = append(data, fmt.Sprintf("InundationList: %s", strings.Join(inuDetails, "; ")))
	}

	if status.Pumping != nil {
		ict := time.FixedZone("ICT", 7*3600)
		now := time.Now().In(ict)
		startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, ict).Unix()

		var pumpDetails []string
		for _, st := range status.Pumping.Stations {
			if st.PumpCount > 0 && st.Priority > 0 {
				statusText := ""
				if st.OperatingCount > 0 {
					statusText = fmt.Sprintf("Đang vận hành (%d/%d)", st.OperatingCount, st.PumpCount)
				} else if st.LastOperationTime >= startOfDay {
					lastTime := time.Unix(st.LastOperationTime, 0).In(ict).Format("15:04")
					statusText = fmt.Sprintf("Vận hành gần nhất: %s", lastTime)
				}

				if statusText != "" {
					pumpDetails = append(pumpDetails, fmt.Sprintf("%s: %s", st.Name, statusText))
				}
			}
		}
		if len(pumpDetails) > 0 {
			data = append(data, fmt.Sprintf("TramBom: %s", strings.Join(pumpDetails, "; ")))
		}
	}

	return fmt.Sprintf(promt.Get("report_viber"), strings.Join(data, "\n"))
}

func (s *service) buildDynamicPrompt(status *CityStatus, hh, dd, mm, yyyy string) string {
	rainIntro := "Hiện tại thành phố không ghi nhận có mưa."
	if status.Weather != nil {
		rainIntro = status.Weather.SummaryText
	}

	waterStr := "Mực nước hệ thống đang ở mức an toàn."
	if status.Water != nil && status.Water.SummaryText != "" {
		waterStr = status.Water.SummaryText
	}

	inuStr := "An toàn, không ghi nhận điểm úng ngập."
	if status.Inundation != nil {
		inuStr = status.Inundation.FullSummary
		if inuStr == "" {
			inuStr = status.Inundation.SummaryText
		}
	}
	pumpStr := "Hiện tại không ghi nhận trạm bơm nào đang vận hành."
	if status.Pumping != nil {
		pumpStr = status.Pumping.SummaryText
	}

	wwStr := "Không có báo cáo từ các nhà máy xử lý nước thải."
	if len(status.Wastewater) > 0 {
		var wwInfos []string
		for _, w := range status.Wastewater {
			note := "Không có báo cáo"
			if w.LastReport != nil && w.LastReport.Note != "" {
				note = w.LastReport.Note
			}
			wwInfos = append(wwInfos, fmt.Sprintf("- %s: %s", w.Name, note))
		}
		if len(wwInfos) > 0 {
			wwStr = strings.Join(wwInfos, "\n")
		}
	}

	ocrStr := "Không có thông tin dự báo."
	if status.OCRText != "" {
		ocrStr = status.OCRText
	}

	return fmt.Sprintf(promt.Get("report_dynamic"), hh, dd+"/"+mm+"/"+yyyy, rainIntro, waterStr, inuStr, pumpStr, wwStr, ocrStr)
}

func (s *service) buildFullWordPrompt(status *CityStatus, hh, dd, mm, yyyy string) string {
	ocrText := status.OCRText
	if ocrText == "" {
		ocrText = "Không có thông tin bản tin dự báo."
	}

	rainyStations := 0
	maxRain := "Không ghi nhận"
	if status.Weather != nil {
		rainyStations = status.Weather.RainyStations
		maxRain = fmt.Sprintf("%s (%.1f mm)", status.Weather.MaxRainStation.Name, status.Weather.MaxRainStation.TotalRain)
	}

	inuCount := 0
	inuDetails := "Không có điểm ngập."
	if status.Inundation != nil {
		inuCount = status.Inundation.ActivePoints
		var detailStrings []string
		for _, p := range status.Inundation.OngoingPoints {
			detailStrings = append(detailStrings, fmt.Sprintf("%s (ngập %v x %v x %.2f)", p.StreetName, p.Length, p.Width, p.Depth))
		}
		if len(detailStrings) > 0 {
			inuDetails = strings.Join(detailStrings, ", ")
		}
	}

	pumpDetails := "Không có trạm bơm nào vận hành."
	if status.Pumping != nil {
		var list []string
		ict := time.FixedZone("ICT", 7*3600)
		for _, st := range status.Pumping.Stations {
			if st.OperatingCount > 0 {
				tStr := ""
				if st.LastOperationTime > 0 {
					tStr = time.Unix(st.LastOperationTime, 0).In(ict).Format("15h04")
				} else {
					tStr = time.Now().In(ict).Format("15h04")
				}
				pType := "trạm bơm thường"
				if st.Priority > 0 {
					pType = "trạm bơm đầu mối"
				}
				list = append(list, fmt.Sprintf("%s (%s): %d/%d máy đang vận hành lúc %s", st.Name, pType, st.OperatingCount, st.PumpCount, tStr))
			}
		}
		if len(list) > 0 {
			pumpDetails = strings.Join(list, "; ")
		}
	}

	return fmt.Sprintf(promt.Get("report_full_word"),
		ocrText,
		rainyStations, maxRain,
		inuCount, inuDetails,
		pumpDetails,
		hh, dd, mm, yyyy,
	)
}

