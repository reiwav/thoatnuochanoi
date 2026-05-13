package googleapi

import (
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
	Ten       string `json:"Tên điểm ngập"`
	DonVi     string `json:"Đơn vị quản lý"`
	ThoiGian  string `json:"Thời gian"`
	KichThuoc string `json:"Kích thước (DxRxS)"`
	TrangThai string `json:"Trạng thái"`
	Color     string `json:"color"`
}

func (s *service) populateRainTable(res *ChatResponse, status *CityStatus) {
	if status.Weather == nil || len(status.Weather.Measurements) == 0 {
		return
	}
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

func (s *service) populateWaterTable(res *ChatResponse, status *CityStatus) {
	if status.Water == nil {
		return
	}
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

func (s *service) populateInundationTable(res *ChatResponse, status *CityStatus) {
	if status.Inundation == nil || len(status.Inundation.OngoingPoints) == 0 {
		return
	}
	var inundations []InundationTableRow
	for i, m := range status.Inundation.OngoingPoints {
		inundations = append(inundations, InundationTableRow{
			STT:       i + 1,
			Ten:       m.StreetName,
			DonVi:     m.OrgName,
			ThoiGian:  m.StartTime,
			KichThuoc: fmt.Sprintf("%v x %v x %v", m.Length, m.Width, fmt.Sprintf("%.2f", m.Depth)),
			TrangThai: m.CurrentStatus,
			Color:     m.Color,
		})
	}
	res.Tables["inundations"] = inundations
}

func (s *service) populatePumpingTable(res *ChatResponse, status *CityStatus) {
	if status.Pumping == nil || len(status.Pumping.Stations) == 0 {
		return
	}
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

func (s *service) populateWastewaterTable(res *ChatResponse, status *CityStatus) {
	if len(status.Wastewater) == 0 {
		return
	}
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
