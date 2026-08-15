package googleapi

// Row shapes for the tables the frontend renders, plus the single constructor
// for each shape.
//
// This file is the sole owner of these JSON contracts. Anything that needs to
// build one of these tables (the gemini chat mapper, the report populators, the
// weather/rain handlers) must call the constructors here rather than declare a
// local struct with the same tags, so a column can never drift between
// producers. The Vietnamese JSON keys are the contract with the frontend and
// must not be renamed.

import (
	"fmt"
	"time"

	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/station/inundation"
	pumpingstation "ai-api-tnhn/internal/service/station/pumping_station"
	"ai-api-tnhn/internal/service/station/sluice_gate"
	waterdto "ai-api-tnhn/internal/service/station/water/dto"
	"ai-api-tnhn/utils"
)

// ---------------------------------------------------------------------------
// Rain
// ---------------------------------------------------------------------------

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
	ID        string  `json:"id"`
	OldID     int     `json:"old_id"`
	IsRaining bool    `json:"is_raining"`
	Date      string  `json:"date,omitempty"`
}

// NewRainTableRow converts raw measurement data into a RainTableRow.
// This is the single source of truth for the conversion logic, used by
// handler/weather.go, handler/google/rain.go, the gemini chat mapper and the
// report populators below.
func NewRainTableRow(stt int, id string, oldID int, name, address, typ string, priority int, totalRain float64, isRaining bool, startTime, endTime, date string) RainTableRow {
	statusStr := "✅ Đã tạnh"
	if isRaining {
		statusStr = "🌧️ Đang mưa"
	}
	timeStr := ""
	if startTime != "" && endTime != "" {
		if startTime == endTime {
			timeStr = endTime
		} else {
			timeStr = fmt.Sprintf("%s - %s", startTime, endTime)
		}
	} else if endTime != "" {
		timeStr = endTime
	}
	return RainTableRow{
		STT:       stt,
		Tram:      name,
		DiaChi:    address,
		LuongMua:  fmt.Sprintf("%.1f", totalRain),
		ThoiGian:  timeStr,
		TrangThai: statusStr,
		Type:      typ,
		Priority:  priority,
		TotalRain: totalRain,
		ID:        id,
		OldID:     oldID,
		IsRaining: isRaining,
		Date:      date,
	}
}

// ---------------------------------------------------------------------------
// Water (lakes and rivers share one shape)
// ---------------------------------------------------------------------------

type WaterTableRow struct {
	STT       int    `json:"STT"`
	Ten       string `json:"Tên"`
	DiaChi    string `json:"Địa chỉ"`
	GiaTri    string `json:"Giá trị"`
	CapNhat   string `json:"Cập nhật"`
	TrangThai string `json:"Trạng thái,omitempty"`
	Color     string `json:"color,omitempty"`
	Priority  int    `json:"priority"`
}

// NewWaterTableRows builds the rows for one list of water stations. Lakes and
// rivers use identical presentation rules, so both call this.
//
// A station with no reading for the day renders as placeholder dashes rather
// than a misleading 0.00, and a station that has data but no explicit status
// falls back to "Bình thường"/"normal".
func NewWaterTableRows(stations []waterdto.WaterStationStat) []WaterTableRow {
	var rows []WaterTableRow
	for i, m := range stations {
		giaTri := fmt.Sprintf("%.2f", m.Level)
		capNhat := m.ThoiGian
		stText := m.StatusText
		col := m.ThresholdStatus

		if !m.HasData || col == "no_data" {
			giaTri = "..."
			capNhat = "..."
			stText = "Chưa có dữ liệu"
			col = "no_data"
		} else {
			if stText == "" {
				stText = "Bình thường"
			}
			if col == "" {
				col = "normal"
			}
		}

		rows = append(rows, WaterTableRow{
			STT:       i + 1,
			Ten:       m.Name,
			DiaChi:    m.Address,
			GiaTri:    giaTri,
			CapNhat:   capNhat,
			TrangThai: stText,
			Color:     col,
			Priority:  m.Priority,
		})
	}
	return rows
}

// ---------------------------------------------------------------------------
// Pumping stations
// ---------------------------------------------------------------------------

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

// NewPumpTableRows builds the pumping-station rows.
//
// "Mất tín hiệu" is derived, not stored: a station that has pumps but reports
// zero in every state (operating, closed, maintenance) is treated as having
// lost signal for all of them.
func NewPumpTableRows(summary *pumpingstation.PumpingStationSummaryData) []PumpTableRow {
	if summary == nil {
		return nil
	}
	var rows []PumpTableRow
	for _, st := range summary.Stations {
		noSig := 0
		if st.PumpCount > 0 && st.OperatingCount == 0 && st.ClosedCount == 0 && st.MaintenanceCount == 0 {
			noSig = st.PumpCount
		}
		rows = append(rows, PumpTableRow{
			Ten:        st.Name,
			VanHanh:    st.OperatingCount,
			KhongVH:    st.ClosedCount,
			BaoDuong:   st.MaintenanceCount,
			MatTinHieu: noSig,
			TongSoBom:  st.PumpCount,
			CapNhat:    st.LastUpdate,
			Priority:   st.Priority,
		})
	}
	return rows
}

// ---------------------------------------------------------------------------
// Sluice gates
// ---------------------------------------------------------------------------

type SluiceGateTableRow struct {
	Ten       string `json:"Tên cửa phai"`
	Mo        int    `json:"Mở"`
	Dong      int    `json:"Đóng"`
	TongSoCua int    `json:"Tổng số cửa"`
	CapNhat   string `json:"Cập nhật"`
	Note      string `json:"Ghi chú"`
	Priority  int    `json:"priority"`
}

// NewSluiceGateTableRows builds the sluice-gate rows. Quantity is the total
// number of doors on the gate.
func NewSluiceGateTableRows(summary *sluice_gate.SluiceGateSummaryData) []SluiceGateTableRow {
	if summary == nil {
		return nil
	}
	var rows []SluiceGateTableRow
	for _, st := range summary.Gates {
		rows = append(rows, SluiceGateTableRow{
			Ten:       st.Name,
			Mo:        st.OpenCount,
			Dong:      st.ClosedCount,
			TongSoCua: st.Quantity,
			CapNhat:   st.LastUpdate,
			Note:      st.Note,
			Priority:  st.Priority,
		})
	}
	return rows
}

// ---------------------------------------------------------------------------
// Inundation
// ---------------------------------------------------------------------------

type InundationTableRow struct {
	STT       int    `json:"STT"`
	Ten       string `json:"Tên điểm ngập"`
	DonVi     string `json:"Đơn vị quản lý"`
	ThoiGian  string `json:"Thời gian"`
	KichThuoc string `json:"Kích thước (DxRxS)"`
	TrangThai string `json:"Trạng thái"`
	Color     string `json:"color"`
	PointID   string `json:"point_id"`
	ReportID  string `json:"report_id"`
}

// NewInundationTableRows builds the inundation rows. Length and Width arrive as
// free-text strings while Depth is numeric, hence the mixed formatting.
func NewInundationTableRows(points []inundation.InundationStationStat) []InundationTableRow {
	var rows []InundationTableRow
	for i, m := range points {
		rows = append(rows, InundationTableRow{
			STT:       i + 1,
			Ten:       m.StreetName,
			DonVi:     m.OrgName,
			ThoiGian:  m.StartTime,
			KichThuoc: fmt.Sprintf("%v x %v x %v", m.Length, m.Width, fmt.Sprintf("%.2f", m.Depth)),
			TrangThai: m.CurrentStatus,
			Color:     m.Color,
			PointID:   m.PointID,
			ReportID:  m.ReportID,
		})
	}
	return rows
}

// ---------------------------------------------------------------------------
// Wastewater treatment
// ---------------------------------------------------------------------------

type WastewaterTableRow struct {
	STT      int    `json:"STT"`
	Ten      string `json:"Tên"`
	BaoCao   string `json:"Báo cáo"`
	ThoiGian string `json:"Thời gian"`
}

// NewWastewaterTableRows builds the wastewater rows.
//
// Timestamp fallback order: the report's own timestamp, else the station's
// updated_at, else a dash. Note the station fallback only applies when there is
// no report at all: a report with a zero timestamp shows a dash rather than
// borrowing the station's time.
func NewWastewaterTableRows(stations []*models.WastewaterStation) []WastewaterTableRow {
	var rows []WastewaterTableRow
	for i, m := range stations {
		bc := "Bình thường"
		tg := "-"
		if m.LastReport != nil {
			if m.LastReport.Note != "" {
				bc = m.LastReport.Note
			}
			if m.LastReport.Timestamp > 0 {
				tg = time.Unix(m.LastReport.Timestamp, 0).In(utils.VietnamLocation).Format("15:04 02/01/2006")
			}
		} else if m.MTime > 0 {
			tg = time.Unix(m.MTime, 0).In(utils.VietnamLocation).Format("15:04 02/01/2006")
		}
		rows = append(rows, WastewaterTableRow{
			STT:      i + 1,
			Ten:      m.Name,
			BaoCao:   bc,
			ThoiGian: tg,
		})
	}
	return rows
}
