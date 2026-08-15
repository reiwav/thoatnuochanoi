package googleapi

// Golden tests that freeze the JSON shape produced by the table-population layer.
//
// Purpose: these files are the regression net for the refactor of
// internal/service/google. The .golden files are generated from the code as it
// existed BEFORE the refactor. Any behaviour-preserving task MUST keep them
// byte-identical. If a golden file changes during a "no behaviour change" task,
// that is a regression, not a golden that needs updating.
//
// Regenerate deliberately with:
//	go test ./internal/service/google/googleapi/ -run Golden -update

import (
	"bytes"
	"encoding/json"
	"flag"
	"os"
	"path/filepath"
	"testing"
	"time"

	"ai-api-tnhn/internal/base/model"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/station/inundation"
	pumpingstation "ai-api-tnhn/internal/service/station/pumping_station"
	waterdto "ai-api-tnhn/internal/service/station/water/dto"
	"ai-api-tnhn/internal/service/weather"
)

var updateGolden = flag.Bool("update", false, "rewrite .golden files from current output")

// assertGolden marshals got and compares it against testdata/<name>.golden.
func assertGolden(t *testing.T, name string, got interface{}) {
	t.Helper()

	data, err := json.MarshalIndent(got, "", "  ")
	if err != nil {
		t.Fatalf("marshal %s: %v", name, err)
	}
	data = append(data, '\n')

	path := filepath.Join("testdata", name+".golden")

	if *updateGolden {
		if err := os.MkdirAll("testdata", 0o755); err != nil {
			t.Fatalf("mkdir testdata: %v", err)
		}
		if err := os.WriteFile(path, data, 0o644); err != nil {
			t.Fatalf("write %s: %v", path, err)
		}
		t.Logf("updated %s", path)
		return
	}

	want, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s (run with -update to create): %v", path, err)
	}
	if !bytes.Equal(want, data) {
		t.Errorf("golden mismatch for %s\n--- want ---\n%s\n--- got ---\n%s", name, want, data)
	}
}

// fixedTime is an arbitrary but stable instant so formatted timestamps never
// depend on the wall clock.
var fixedTime = time.Date(2026, 3, 7, 11, 30, 0, 0, time.UTC)

// rainFixture exercises the sort in populateRainTable and every branch of
// NewRainTableRow's time-string collapsing.
//
// Note on Type values: the sort compares against the diacritic forms
// "phường"/"xã" while real data carries "phuong"/"xa", so the phuong/xa
// grouping does not trigger for realistic values. Both forms are included here
// so the golden records the behaviour as it actually is.
func rainFixture() *weather.RainSummaryData {
	ms := []weather.RainStationStat{
		{ID: "r1", OldID: 101, Name: "Trạm Hoàn Kiếm", Address: "Hoàn Kiếm", Type: "phuong", Priority: 1, TotalRain: 10.5, IsRaining: true, StartTime: "07:00", EndTime: "08:00"},
		{ID: "r2", OldID: 102, Name: "Trạm Đông Anh", Address: "Đông Anh", Type: "xa", Priority: 5, TotalRain: 30, IsRaining: false, StartTime: "06:00", EndTime: "06:00"},
		{ID: "r3", OldID: 103, Name: "Trạm Ba Đình", Address: "Ba Đình", Type: "phuong", Priority: 3, TotalRain: 10.5, IsRaining: false, StartTime: "", EndTime: "09:00"},
		{ID: "r4", OldID: 104, Name: "Trạm Cầu Giấy", Address: "Cầu Giấy", Type: "phuong", Priority: 3, TotalRain: 22, IsRaining: true, StartTime: "", EndTime: ""},
		{ID: "r5", OldID: 105, Name: "Trạm Sóc Sơn", Address: "Sóc Sơn", Type: "xa", Priority: 5, TotalRain: 5, IsRaining: false, StartTime: "05:00", EndTime: "07:30"},
		{ID: "r6", OldID: 106, Name: "Trạm Tây Hồ", Address: "Tây Hồ", Type: "Phường Tây Hồ", Priority: 2, TotalRain: 1, IsRaining: false, StartTime: "04:00", EndTime: "04:30"},
	}
	return &weather.RainSummaryData{
		TotalStations:  len(ms),
		RainyStations:  2,
		MaxRainStation: ms[1],
		Measurements:   ms,
		IntensityLabel: "mưa vừa",
		SpreadLabel:    "rải rác",
		StartTimeFull:  fixedTime,
		EndTimeFull:    fixedTime.Add(time.Hour),
		SummaryText:    "Có 2 trạm đang mưa",
	}
}

// waterFixture covers both no-data branches: HasData=false, and an explicit
// ThresholdStatus of "no_data" while HasData is true.
func waterFixture() *waterdto.WaterSummaryData {
	return &waterdto.WaterSummaryData{
		TotalStations: 5,
		LakeStations: []waterdto.WaterStationStat{
			{Name: "Hồ Bảy Mẫu", Level: 5.25, Label: "Hồ", ThoiGian: "10:30", Priority: 1, Address: "Thống Nhất", ThresholdStatus: "high", StatusText: "Vượt ngưỡng cao", IsExceeded: true, HasData: true, MaxThreshold: 5},
			{Name: "Hồ Thiền Quang", Level: 0, Label: "Hồ", ThoiGian: "-", Priority: 2, Address: "Trần Nhân Tông", HasData: false},
			{Name: "Hồ Tây", Level: 3, Label: "Hồ", ThoiGian: "11:00", Priority: 3, Address: "Tây Hồ", HasData: true},
		},
		RiverStations: []waterdto.WaterStationStat{
			{Name: "Sông Tô Lịch", Level: 2.1, Label: "Sông", ThoiGian: "10:45", Priority: 1, Address: "Cầu Giấy", ThresholdStatus: "no_data", StatusText: "Chưa có dữ liệu", HasData: true},
			{Name: "Sông Nhuệ", Level: 1.5, Label: "Sông", ThoiGian: "10:50", Priority: 2, Address: "Hà Đông", ThresholdStatus: "low", StatusText: "Dưới ngưỡng thấp", IsExceeded: true, HasData: true, MinThreshold: 2},
		},
		SummaryText:  "Mực nước bình thường",
		RiverSummary: "Các trạm sông ổn định",
		LakeSummary:  "Hồ Bảy Mẫu vượt ngưỡng",
	}
}

// pumpingFixture includes the "mất tín hiệu" case (pumps exist but every
// per-state counter is zero) and the PumpCount==0 guard.
func pumpingFixture() *pumpingstation.PumpingStationSummaryData {
	return &pumpingstation.PumpingStationSummaryData{
		TotalStations:          4,
		TotalOperatingStations: 1,
		TotalPumps:             9,
		TotalOperatingPumps:    2,
		Stations: []pumpingstation.PumpingStationStat{
			{Name: "Trạm bơm Yên Sở", Priority: 1, OrgName: "XN 1", PumpCount: 4, OperatingCount: 2, ClosedCount: 1, MaintenanceCount: 1, Note: "Chạy 2 máy", LastUpdate: "11:20 07/03/2026", LastOperationTime: 1772000000},
			{Name: "Trạm bơm Đồng Bông 1", Priority: 2, OrgName: "XN 2", PumpCount: 3, OperatingCount: 0, ClosedCount: 0, MaintenanceCount: 0, Note: "", LastUpdate: "09:00 07/03/2026", LastOperationTime: 0},
			{Name: "Trạm bơm Cổ Nhuế", Priority: 0, OrgName: "XN 3", PumpCount: 0, OperatingCount: 0, ClosedCount: 0, MaintenanceCount: 0, Note: "Chưa lắp bơm", LastUpdate: "", LastOperationTime: 0},
			{Name: "Trạm bơm Bắc Thăng Long", Priority: 1, OrgName: "XN 4", PumpCount: 2, OperatingCount: 0, ClosedCount: 2, MaintenanceCount: 0, Note: "", LastUpdate: "10:00 07/03/2026", LastOperationTime: 1771900000},
		},
		SummaryText:         "1 trạm đang vận hành",
		SummaryPriorityText: "Yên Sở đang vận hành",
	}
}

// inundationFixture covers a fully-populated point and one with empty
// dimensions so the "%v x %v x %.2f" formatting is pinned.
func inundationFixture() *inundation.InundationSummaryData {
	return &inundation.InundationSummaryData{
		ActivePoints: 2,
		SummaryText:  "có 2 điểm úng ngập",
		FullSummary:  "Phan Bội Châu (Ngập sâu, 0.25m), Nguyễn Khuyến (úng ngập)",
		OngoingPoints: []inundation.InundationStationStat{
			{
				PointID: "p1", ReportID: "rp1", StreetName: "Phan Bội Châu", OrgName: "Xí nghiệp thoát nước số 1",
				Depth: 0.25, Width: "50", Length: "100", FormattedDepth: "100 x 50 x 0.25m",
				StartTime: "08:15 07/03/2026", Duration: "3 giờ", Description: "Ngập do mưa lớn",
				Color: "#FF0000", CurrentStatus: "Đang ngập", FloodLevelName: "Ngập sâu",
			},
			{
				PointID: "p2", ReportID: "rp2", StreetName: "Nguyễn Khuyến", OrgName: "Xí nghiệp thoát nước số 2",
				Depth: 0, Width: "", Length: "", FormattedDepth: "chưa rõ độ sâu",
				StartTime: "09:00 07/03/2026", Duration: "2 giờ", Description: "",
				Color: "", CurrentStatus: "Đã rút", FloodLevelName: "",
			},
		},
	}
}

// wastewaterFixture covers all four report/timestamp fallback combinations.
func wastewaterFixture() []*models.WastewaterStation {
	return []*models.WastewaterStation{
		{
			BaseModel: model.BaseModel{ID: "w1", MTime: 1772000000},
			Name:      "NM Yên Sở", Address: "Hoàng Mai", Active: true, OrgID: "o1", Priority: 1,
			LastReport: &models.WastewaterStationReport{
				BaseModel: model.BaseModel{ID: "wr1", CTime: 1771990000, MTime: 1771995000},
				StationID: "w1", UserID: "u1", UserName: "Nguyễn Văn A",
				Note: "Vận hành ổn định, nước đầu ra trong", Timestamp: 1772000000,
			},
		},
		{
			BaseModel: model.BaseModel{ID: "w2", MTime: 1772000600},
			Name:      "NM Bảy Mẫu", Address: "Đống Đa", Active: true, OrgID: "o1", Priority: 2,
			LastReport: nil,
		},
		{
			BaseModel: model.BaseModel{ID: "w3", MTime: 0},
			Name:      "NM Kim Liên", Address: "Đống Đa", Active: true, OrgID: "o2", Priority: 3,
			LastReport: nil,
		},
		{
			BaseModel: model.BaseModel{ID: "w4", MTime: 1772001000},
			Name:      "NM Trúc Bạch", Address: "Ba Đình", Active: true, OrgID: "o2", Priority: 4,
			LastReport: &models.WastewaterStationReport{
				BaseModel: model.BaseModel{ID: "wr4"},
				StationID: "w4", Note: "", Timestamp: 0,
			},
		},
	}
}

func fullStatusFixture() *CityStatus {
	return &CityStatus{
		Weather:    rainFixture(),
		Water:      waterFixture(),
		Inundation: inundationFixture(),
		Pumping:    pumpingFixture(),
		Wastewater: wastewaterFixture(),
		OCRText:    "Bản tin dự báo mẫu",
	}
}

// newTables runs one populate* method against the fixture and returns the
// resulting Tables map. populate* touch no service fields, so a zero service is
// sufficient.
func newTables(t *testing.T, populate func(*service, *ChatResponse, *CityStatus)) map[string]interface{} {
	t.Helper()
	res := &ChatResponse{Tables: make(map[string]interface{})}
	populate(&service{}, res, fullStatusFixture())
	return res.Tables
}

func TestGoldenPopulateRainTable(t *testing.T) {
	got := newTables(t, func(s *service, r *ChatResponse, c *CityStatus) { s.populateRainTable(r, c) })
	assertGolden(t, "populate_rain", got)
}

func TestGoldenPopulateWaterTable(t *testing.T) {
	got := newTables(t, func(s *service, r *ChatResponse, c *CityStatus) { s.populateWaterTable(r, c) })
	assertGolden(t, "populate_water", got)
}

func TestGoldenPopulateInundationTable(t *testing.T) {
	got := newTables(t, func(s *service, r *ChatResponse, c *CityStatus) { s.populateInundationTable(r, c) })
	assertGolden(t, "populate_inundation", got)
}

func TestGoldenPopulatePumpingTable(t *testing.T) {
	got := newTables(t, func(s *service, r *ChatResponse, c *CityStatus) { s.populatePumpingTable(r, c) })
	assertGolden(t, "populate_pumping", got)
}

func TestGoldenPopulateWastewaterTable(t *testing.T) {
	got := newTables(t, func(s *service, r *ChatResponse, c *CityStatus) { s.populateWastewaterTable(r, c) })
	assertGolden(t, "populate_wastewater", got)
}

// TestGoldenPopulateAll pins the combined output, which is what
// GenerateAIReport actually sends to the frontend.
func TestGoldenPopulateAll(t *testing.T) {
	s := &service{}
	res := &ChatResponse{Text: "Dưới đây là thông tin chi tiết:", Tables: make(map[string]interface{})}
	status := fullStatusFixture()
	s.populateRainTable(res, status)
	s.populateWaterTable(res, status)
	s.populateInundationTable(res, status)
	s.populatePumpingTable(res, status)
	s.populateWastewaterTable(res, status)
	assertGolden(t, "populate_all", res)
}

// TestGoldenPopulateEmptyStatus pins the "nothing to report" path: every
// populate* must leave Tables untouched rather than emit empty slices.
func TestGoldenPopulateEmptyStatus(t *testing.T) {
	s := &service{}
	res := &ChatResponse{Tables: make(map[string]interface{})}
	empty := &CityStatus{
		Weather:    &weather.RainSummaryData{},
		Water:      &waterdto.WaterSummaryData{},
		Inundation: &inundation.InundationSummaryData{},
		Pumping:    &pumpingstation.PumpingStationSummaryData{},
	}
	s.populateRainTable(res, empty)
	s.populateWaterTable(res, empty)
	s.populateInundationTable(res, empty)
	s.populatePumpingTable(res, empty)
	s.populateWastewaterTable(res, empty)
	assertGolden(t, "populate_empty", res)

	nilStatus := &CityStatus{}
	res2 := &ChatResponse{Tables: make(map[string]interface{})}
	s.populateRainTable(res2, nilStatus)
	s.populateWaterTable(res2, nilStatus)
	s.populateInundationTable(res2, nilStatus)
	s.populatePumpingTable(res2, nilStatus)
	s.populateWastewaterTable(res2, nilStatus)
	if len(res2.Tables) != 0 {
		t.Errorf("nil sections must produce no tables, got %d: %v", len(res2.Tables), res2.Tables)
	}
}

// TestGoldenNewRainTableRow pins NewRainTableRow directly, including every
// start/end time combination and both raining states.
func TestGoldenNewRainTableRow(t *testing.T) {
	type tc struct {
		Case string       `json:"case"`
		Row  RainTableRow `json:"row"`
	}
	rows := []tc{
		{"start_and_end_differ", NewRainTableRow(1, "r1", 101, "Trạm A", "Địa chỉ A", "phuong", 1, 12.34, true, "07:00", "08:00", "2026-03-07")},
		{"start_equals_end", NewRainTableRow(2, "r2", 102, "Trạm B", "Địa chỉ B", "xa", 5, 30, false, "06:00", "06:00", "2026-03-07")},
		{"end_only", NewRainTableRow(3, "r3", 103, "Trạm C", "Địa chỉ C", "phuong", 3, 0, false, "", "09:00", "2026-03-07")},
		{"start_only", NewRainTableRow(4, "r4", 104, "Trạm D", "Địa chỉ D", "phuong", 3, 22, true, "05:00", "", "2026-03-07")},
		{"no_times", NewRainTableRow(5, "r5", 105, "Trạm E", "Địa chỉ E", "xa", 0, 0.05, false, "", "", "")},
	}
	assertGolden(t, "new_rain_table_row", rows)
}
