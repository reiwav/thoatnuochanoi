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
		var pumpNames []string
		for _, st := range status.Pumping.Stations {
			if st.PumpCount > 0 && st.Priority > 0 {
				pumpNames = append(pumpNames, st.Name)
			}
		}
		data = append(data, fmt.Sprintf("OperatingPumps: %s", strings.Join(pumpNames, ", ")))
	}

	return fmt.Sprintf(promt.Get("report_viber"), strings.Join(data, "\n"))
}

func (s *service) buildDynamicPrompt(status *CityStatus, hh, dd, mm, yyyy string) string {
	rainIntro := "Currently no rain recorded in the city."
	if status.Weather != nil {
		rainIntro = status.Weather.SummaryText
	}

	waterStr := "System water levels are at safe levels."
	if status.Water != nil && status.Water.SummaryText != "" {
		waterStr = status.Water.SummaryText
	}

	inuStr := "Safe, no inundation."
	if status.Inundation != nil {
		inuStr = status.Inundation.FullSummary
		if inuStr == "" {
			inuStr = status.Inundation.SummaryText
		}
	}
	pumpStr := "No pumping stations are currently operating."
	if status.Pumping != nil {
		pumpStr = status.Pumping.SummaryText
	}

	wwStr := "No reports from wastewater treatment plants."
	if len(status.Wastewater) > 0 {
		var wwInfos []string
		for _, w := range status.Wastewater {
			note := "No report"
			if w.LastReport != nil && w.LastReport.Note != "" {
				note = w.LastReport.Note
			}
			wwInfos = append(wwInfos, fmt.Sprintf("- %s: %s", w.Name, note))
		}
		if len(wwInfos) > 0 {
			wwStr = strings.Join(wwInfos, "\n")
		}
	}

	ocrStr := "No forecast information available."
	if status.OCRText != "" {
		ocrStr = status.OCRText
	}

	return fmt.Sprintf(promt.Get("report_dynamic"), hh, dd+"/"+mm+"/"+yyyy, rainIntro, waterStr, inuStr, pumpStr, wwStr, ocrStr)
}
