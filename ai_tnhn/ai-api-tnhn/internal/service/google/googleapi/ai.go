package googleapi

import (
	"ai-api-tnhn/internal/constant"
	"ai-api-tnhn/internal/service/google/gemini/promt"
	"context"
	"fmt"
	"sort"
	"strings"
	"time"
)

type RainTableRow struct {
	STT       int     `json:"STT"`
	Tram      string  `json:"Trạm"`
	DiaChi    string  `json:"Địa chỉ"`
	LuongMua  string  `json:"Lượng mưa"`
	ThoiGian  string  `json:"Thời gian"`
	TrangThai string  `json:"Trạng thái"`
	Type      string  `json:"type"`
	Priority  int     `json:"priority"`
	TotalRain float64 `json:"total_rain"`
	ID        int     `json:"id"`
}

type WaterTableRow struct {
	STT      int    `json:"STT"`
	Ten      string `json:"Tên"`
	DiaChi   string `json:"Địa chỉ"`
	GiaTri   string `json:"Giá trị"`
	CapNhat  string `json:"Cập nhật"`
	Priority int    `json:"priority"`
}

type PumpTableRow struct {
	Ten        string `json:"Tên trạm bơm"`
	VanHanh    int    `json:"Vận hành"`
	KhongVH    int    `json:"Không VH"`
	BaoDuong   int    `json:"Bảo dưỡng"`
	MatTinHieu int    `json:"Mất tín hiệu"`
	TongSoBom  int    `json:"Tổng số bơm"`
	CapNhat    string `json:"Cập nhật"`
	Priority   int    `json:"priority"`
}

type WastewaterTableRow struct {
	STT      int    `json:"STT"`
	Ten      string `json:"Tên"`
	BaoCao   string `json:"Báo cáo"`
	ThoiGian string `json:"Thời gian"`
}

type InundationTableRow struct {
	STT       int    `json:"STT"`
	ViTri     string `json:"Vị trí ngập"`
	DoSau     string `json:"Độ sâu"`
	KichThuoc string `json:"Kích thước"`
	GioBatDau string `json:"Giờ bắt đầu"`
	TrangThai string `json:"Trạng thái"`
	DonVi     string `json:"Đơn vị trực"`
}

func (s *service) GenerateAIReport(ctx context.Context, reportType string, userID string) (*ChatResponse, error) {
	if s.geminiSvc == nil {
		return nil, fmt.Errorf("gemini service is not initialized")
	}

	status, err := s.GetCityStatus(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get city status: %w", err)
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
		return nil, fmt.Errorf("unsupported report type: %s", reportType)
	}

	// If prompt is a simple message (not a complex prompt), return it directly as a ChatResponse
	lowerPrompt := strings.ToLower(prompt)
	if !strings.Contains(lowerPrompt, "nhiệm vụ") && !strings.Contains(lowerPrompt, "quy tắc") && !strings.Contains(lowerPrompt, "tóm tắt") {
		return &ChatResponse{
			Text:   prompt,
			Tables: make(map[string]interface{}),
		}, nil
	}

	res, err := s.geminiSvc.Chat(ctx, prompt, nil, userID, true, "SKIP_LOG")
	if err != nil {
		return nil, err
	}

	if res != nil {
		if res.Tables == nil {
			res.Tables = make(map[string]interface{})
		}
		if status.Weather != nil && len(status.Weather.Measurements) > 0 {
			indices := make([]int, len(status.Weather.Measurements))
			for i := range indices {
				indices[i] = i
			}
			sort.SliceStable(indices, func(i, j int) bool {
				mI := status.Weather.Measurements[indices[i]]
				mJ := status.Weather.Measurements[indices[j]]
				isPhuongXaI := strings.Contains(strings.ToLower(mI.Type), "phường") || strings.Contains(strings.ToLower(mI.Type), "xã")
				isPhuongXaJ := strings.Contains(strings.ToLower(mJ.Type), "phường") || strings.Contains(strings.ToLower(mJ.Type), "xã")
				if isPhuongXaI != isPhuongXaJ {
					return isPhuongXaJ
				}
				if mI.Priority != mJ.Priority {
					return mI.Priority > mJ.Priority
				}
				return mI.TotalRain > mJ.TotalRain
			})

			var rains []RainTableRow
			for i, idx := range indices {
				m := status.Weather.Measurements[idx]
				statusStr := "✅ Đã tạnh"
				if m.IsRaining {
					statusStr = "🌧️ Đang mưa"
				}
				timeStr := ""
				if m.StartTime != "" && m.EndTime != "" {
					timeStr = fmt.Sprintf("%s - %s", m.StartTime, m.EndTime)
				} else if m.EndTime != "" {
					timeStr = m.EndTime
				}
				rains = append(rains, RainTableRow{
					STT:       i + 1,
					Tram:      m.Name,
					DiaChi:    m.Address,
					LuongMua:  fmt.Sprintf("%.1f", m.TotalRain),
					ThoiGian:  timeStr,
					TrangThai: statusStr,
					Type:      m.Type,
					Priority:  m.Priority,
					TotalRain: m.TotalRain,
					ID:        m.ID,
				})
			}
			res.Tables["rains"] = rains
		}
		if status.Water != nil {
			if len(status.Water.LakeStations) > 0 {
				var lakes []WaterTableRow
				for i, m := range status.Water.LakeStations {
					lakes = append(lakes, WaterTableRow{
						STT:      i + 1,
						Ten:      m.Name,
						DiaChi:   m.Address,
						GiaTri:   fmt.Sprintf("%.2f", m.Level),
						CapNhat:  m.ThoiGian,
						Priority: m.Priority,
					})
				}
				res.Tables["lakes"] = lakes
			}
			if len(status.Water.RiverStations) > 0 {
				var rivers []WaterTableRow
				for i, m := range status.Water.RiverStations {
					rivers = append(rivers, WaterTableRow{
						STT:      i + 1,
						Ten:      m.Name,
						DiaChi:   m.Address,
						GiaTri:   fmt.Sprintf("%.2f", m.Level),
						CapNhat:  m.ThoiGian,
						Priority: m.Priority,
					})
				}
				res.Tables["rivers"] = rivers
			}
		}
		if status.Inundation != nil && len(status.Inundation.OngoingPoints) > 0 {
			var inundations []InundationTableRow
			for i, m := range status.Inundation.OngoingPoints {
				inundations = append(inundations, InundationTableRow{
					STT:       i + 1,
					ViTri:     m.StreetName,
					DoSau:     fmt.Sprintf("%.2f", m.Depth),
					KichThuoc: m.FormattedDepth,
					GioBatDau: m.StartTime,
					TrangThai: m.CurrentStatus,
					DonVi:     m.OrgName,
				})
			}
			res.Tables["inundations"] = inundations
		}
		if status.Pumping != nil && len(status.Pumping.Stations) > 0 {
			var pumping []PumpTableRow
			for _, m := range status.Pumping.Stations {
				noSig := 0
				if m.PumpCount > 0 && m.OperatingCount == 0 && m.ClosedCount == 0 && m.MaintenanceCount == 0 {
					noSig = m.PumpCount
				}
				pumping = append(pumping, PumpTableRow{
					Ten:        m.Name,
					VanHanh:    m.OperatingCount,
					KhongVH:    m.ClosedCount,
					BaoDuong:   m.MaintenanceCount,
					MatTinHieu: noSig,
					TongSoBom:  m.PumpCount,
					CapNhat:    m.LastUpdate,
					Priority:   m.Priority,
				})
			}
			res.Tables["pumping_stations"] = pumping
		}
		if len(status.Wastewater) > 0 {
			var wastewater []WastewaterTableRow
			for i, m := range status.Wastewater {
				bc := "Bình thường"
				tg := "-"
				if m.LastReport != nil {
					if m.LastReport.Note != "" {
						bc = m.LastReport.Note
					}
					if m.LastReport.Timestamp > 0 {
						tg = time.Unix(m.LastReport.Timestamp, 0).In(time.FixedZone("ICT", 7*3600)).Format("15:04 02/01/2006")
					}
				} else if m.MTime > 0 {
					tg = time.Unix(m.MTime, 0).In(time.FixedZone("ICT", 7*3600)).Format("15:04 02/01/2006")
				}
				wastewater = append(wastewater, WastewaterTableRow{
					STT:      i + 1,
					Ten:      m.Name,
					BaoCao:   bc,
					ThoiGian: tg,
				})
			}
			res.Tables["wastewater"] = wastewater
		}
	}

	return res, nil
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
	if status.Weather == nil {
		return ""
	}

	// If no rain at all (both currently and today's total)
	if status.Weather.RainyStations == 0 && status.Weather.MaxRainStation.TotalRain == 0 {
		return fmt.Sprintf("Hiện tại không ghi nhận điểm mưa nào trên địa bàn Thành phố tại thời điểm %s ngày %s/%s/%s. Trên các tuyến đường an toàn, không xảy ra úng ngập.", hh, dd, mm, yyyy)
	}

	rainStartTime, rainEndTime := "rạng sáng", "thời điểm hiện tại"

	if !status.Weather.StartTimeFull.IsZero() {
		rainStartTime = status.Weather.StartTimeFull.Format("15h04")
	}
	if !status.Weather.EndTimeFull.IsZero() && time.Since(status.Weather.EndTimeFull) > 5*time.Minute {
		rainEndTime = status.Weather.EndTimeFull.Format("15h04")
	}

	rainIntensity := "nhỏ"
	if status.Weather.MaxRainStation.TotalRain > 100 {
		rainIntensity = "rất lớn"
	} else if status.Weather.MaxRainStation.TotalRain > 50 {
		rainIntensity = "lớn"
	}

	//(điểm đang mưa và điểm đã mưa): Nếu từ 1-4 điểm thì gọi là "mưa vùng", từ 5-10 điểm thì gọi là "mưa rải rác trên diện rộng", lớn hơn 10 điểm thì gọi là "mưa trên diện rộng".
	rainSpread := "mưa vùng"
	totalRain := len(status.Weather.Measurements) + status.Weather.RainyStations
	if totalRain < 5 {
		rainSpread = "mưa vùng"
	} else if totalRain <= 10 {
		rainSpread = "mưa rải rác trên diện rộng"
	} else {
		rainSpread = "mưa trên diện rộng"
	}

	inuInfo := "Trên các tuyến đường an toàn, không xảy ra úng ngập"
	if status.Inundation != nil && status.Inundation.ActivePoints > 0 {
		inuInfo = status.Inundation.SummaryText + ": " + status.Inundation.FullSummary
	}

	avgRain := 0.0
	if status.Weather != nil && len(status.Weather.Measurements) > 0 {
		var sum float64
		var count int
		for _, m := range status.Weather.Measurements {
			if m.TotalRain > 0 {
				sum += m.TotalRain
				count++
			}
		}
		if count > 0 {
			avgRain = sum / float64(count)
		}
	}

	pumpInfo := "không có trạm bơm nào vận hành"
	if status.Pumping != nil {
		var pumpNames []string
		for _, st := range status.Pumping.Stations {
			if st.PumpCount > 0 && st.Priority > 0 {
				pumpNames = append(pumpNames, st.Name)
			}
		}
		if len(pumpNames) > 0 {
			pumpInfo = "các trạm bơm " + strings.Join(pumpNames, ", ")
		}
	}

	rawSummary := fmt.Sprintf(`- Thời điểm báo cáo: %s ngày %s/%s/%s
- Thời điểm bắt đầu mưa: %s
- Thời điểm kết thúc mưa: %s
- Cường độ mưa: %s
- Diện mưa: %s (%d điểm đo)
- Lượng mưa phổ biến: %.1f đến %.1f mm
- Điểm mưa lớn nhất: %s (%.1f mm)
- Tình trạng úng ngập: %s
- Danh sách trạm bơm: %s`,
		hh, dd, mm, yyyy, rainStartTime, rainEndTime, rainIntensity, rainSpread, status.Weather.RainyStations,
		avgRain, status.Weather.MaxRainStation.TotalRain, status.Weather.MaxRainStation.Name, status.Weather.MaxRainStation.TotalRain, inuInfo, pumpInfo)

	return fmt.Sprintf(promt.Get("report_viber"), rawSummary)
}

func (s *service) buildDynamicPrompt(status *CityStatus, hh, dd, mm, yyyy string) string {
	rainIntro := "Hiện tại trên địa bàn thành phố không ghi nhận điểm mưa nào."
	if status.Weather != nil {
		rainIntro = status.Weather.SummaryText
	}

	waterStr := "Hiện tại mực nước trên hệ thống đang ở mức an toàn."
	if status.Water != nil && status.Water.SummaryText != "" {
		waterStr = status.Water.SummaryText
	}

	inuStr := "An toàn, không ngập."
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

	wwStr := "Không có báo cáo trạm xử lý nước thải."
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
