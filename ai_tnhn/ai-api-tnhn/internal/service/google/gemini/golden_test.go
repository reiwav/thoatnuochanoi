package gemini

// Golden tests that freeze the tool-result -> frontend-table mapping.
//
// The .golden files are generated from the code as it existed BEFORE the
// refactor of internal/service/google. Any behaviour-preserving task MUST keep
// them byte-identical; a change here during a "no behaviour change" task is a
// regression, not a golden to be updated.
//
// Regenerate deliberately with:
//	go test ./internal/service/google/gemini/ -run Golden -update

import (
	"bytes"
	"encoding/json"
	"flag"
	"os"
	"path/filepath"
	"testing"

	pumpingstation "ai-api-tnhn/internal/service/station/pumping_station"
	"ai-api-tnhn/internal/service/station/sluice_gate"
	"ai-api-tnhn/internal/service/station/water"
	"ai-api-tnhn/internal/service/weather"

	"github.com/google/generative-ai-go/genai"
)

var updateGolden = flag.Bool("update", false, "rewrite .golden files from current output")

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

// goldenRainDate is a fixed stand-in for utils.CurrentRainDate() so golden
// output never depends on the wall clock.
const goldenRainDate = "2026-03-07"

func pumpingFixture() *pumpingstation.PumpingStationSummaryData {
	return &pumpingstation.PumpingStationSummaryData{
		TotalStations:          4,
		TotalOperatingStations: 1,
		TotalPumps:             9,
		TotalOperatingPumps:    2,
		Stations: []pumpingstation.PumpingStationStat{
			{Name: "Trạm bơm Yên Sở", Priority: 1, OrgName: "XN 1", PumpCount: 4, OperatingCount: 2, ClosedCount: 1, MaintenanceCount: 1, Note: "Chạy 2 máy", LastUpdate: "11:20 07/03/2026", LastOperationTime: 1772000000},
			// Every per-state counter zero while pumps exist => "Mất tín hiệu".
			{Name: "Trạm bơm Đồng Bông 1", Priority: 2, OrgName: "XN 2", PumpCount: 3, OperatingCount: 0, ClosedCount: 0, MaintenanceCount: 0, LastUpdate: "09:00 07/03/2026"},
			// PumpCount == 0 must NOT be reported as loss of signal.
			{Name: "Trạm bơm Cổ Nhuế", Priority: 0, OrgName: "XN 3", Note: "Chưa lắp bơm"},
			{Name: "Trạm bơm Bắc Thăng Long", Priority: 1, OrgName: "XN 4", PumpCount: 2, ClosedCount: 2, LastUpdate: "10:00 07/03/2026", LastOperationTime: 1771900000},
		},
		SummaryText:         "1 trạm đang vận hành",
		SummaryPriorityText: "Yên Sở đang vận hành",
	}
}

func sluiceGateFixture() *sluice_gate.SluiceGateSummaryData {
	return &sluice_gate.SluiceGateSummaryData{
		TotalGates:     2,
		TotalOpenGates: 1,
		TotalDoors:     8,
		TotalOpenDoors: 2,
		Gates: []sluice_gate.SluiceGateStat{
			{ID: "g1", Name: "Cửa phai Thanh Liệt", Priority: 1, OrgName: "XN 1", Quantity: 3, OpenCount: 2, ClosedCount: 1, Note: "Mở 2 cửa tiêu nước", LastUpdate: "11:25 07/03/2026"},
			{ID: "g2", Name: "Cửa phai Hồ Tây A", Priority: 0, OrgName: "XN 2", Quantity: 5, OpenCount: 0, ClosedCount: 5, Note: "", LastUpdate: "08:10 07/03/2026"},
		},
		SummaryText:         "1 cửa phai đang mở",
		SummaryPriorityText: "Thanh Liệt mở 2 cửa",
	}
}

func waterFixture() *water.WaterSummaryData {
	return &water.WaterSummaryData{
		TotalStations: 3,
		LakeStations: []water.WaterStationStat{
			{Name: "Hồ Bảy Mẫu", Level: 5.25, Label: "Hồ", ThoiGian: "10:30", Priority: 1, Address: "Thống Nhất", ThresholdStatus: "high", StatusText: "Vượt ngưỡng cao", IsExceeded: true, HasData: true, MaxThreshold: 5},
			{Name: "Hồ Thiền Quang", Label: "Hồ", ThoiGian: "-", Priority: 2, Address: "Trần Nhân Tông", HasData: false},
		},
		RiverStations: []water.WaterStationStat{
			{Name: "Sông Tô Lịch", Level: 2.1, Label: "Sông", ThoiGian: "10:45", Priority: 1, Address: "Cầu Giấy", ThresholdStatus: "low", StatusText: "Dưới ngưỡng thấp", IsExceeded: true, HasData: true, MinThreshold: 3},
		},
		SummaryText:  "Mực nước bình thường",
		RiverSummary: "Các trạm sông ổn định",
		LakeSummary:  "Hồ Bảy Mẫu vượt ngưỡng",
	}
}

func rainFixture() *weather.RainSummaryData {
	ms := []weather.RainStationStat{
		{ID: "r1", OldID: 101, Name: "Trạm Hoàn Kiếm", Address: "Hoàn Kiếm", Type: "phuong", Priority: 1, TotalRain: 10.5, IsRaining: true, StartTime: "07:00", EndTime: "08:00"},
		{ID: "r2", OldID: 102, Name: "Trạm Đông Anh", Address: "Đông Anh", Type: "xa", Priority: 5, TotalRain: 30, IsRaining: false, StartTime: "06:00", EndTime: "06:00"},
		{ID: "r3", OldID: 103, Name: "Trạm Ba Đình", Address: "Ba Đình", Type: "phuong", Priority: 3, TotalRain: 0, IsRaining: false, StartTime: "", EndTime: "09:00"},
	}
	return &weather.RainSummaryData{
		TotalStations:  len(ms),
		RainyStations:  1,
		MaxRainStation: ms[1],
		Measurements:   ms,
		SummaryText:    "Có 1 trạm đang mưa",
	}
}

// ---------------------------------------------------------------------------
// transformPumpingStations / transformSluiceGates
// ---------------------------------------------------------------------------

func TestGoldenTransformPumpingStations(t *testing.T) {
	// transform* read no service fields, so a zero service is enough.
	got := (&service{}).transformPumpingStations(pumpingFixture())
	assertGolden(t, "transform_pumping", got)
}

func TestGoldenTransformSluiceGates(t *testing.T) {
	got := (&service{}).transformSluiceGates(sluiceGateFixture())
	assertGolden(t, "transform_sluice_gates", got)
}

// TestTransformFallbacks pins the pass-through behaviour when the type
// assertion fails or the summary is nil: the raw value must be returned
// unchanged rather than dropped.
func TestTransformFallbacks(t *testing.T) {
	s := &service{}

	raw := map[string]interface{}{"unexpected": "shape"}
	if got := s.transformPumpingStations(raw); !jsonEqual(t, got, raw) {
		t.Errorf("transformPumpingStations should pass through unknown shapes, got %#v", got)
	}
	if got := s.transformSluiceGates(raw); !jsonEqual(t, got, raw) {
		t.Errorf("transformSluiceGates should pass through unknown shapes, got %#v", got)
	}

	// A typed nil pointer also falls through to the raw return.
	var nilPump *pumpingstation.PumpingStationSummaryData
	if got := s.transformPumpingStations(nilPump); got == nil {
		t.Error("transformPumpingStations(nil summary) should return the raw value, got nil")
	}
	var nilGate *sluice_gate.SluiceGateSummaryData
	if got := s.transformSluiceGates(nilGate); got == nil {
		t.Error("transformSluiceGates(nil summary) should return the raw value, got nil")
	}
}

func jsonEqual(t *testing.T, a, b interface{}) bool {
	t.Helper()
	ab, err := json.Marshal(a)
	if err != nil {
		return false
	}
	bb, err := json.Marshal(b)
	if err != nil {
		return false
	}
	return bytes.Equal(ab, bb)
}

// ---------------------------------------------------------------------------
// getToolKey
// ---------------------------------------------------------------------------

// TestGoldenGetToolKey pins the tool-name -> table-key mapping for every branch
// of the switch, including the list_stations type sub-branches and the
// unknown-tool fallthrough.
func TestGoldenGetToolKey(t *testing.T) {
	type entry struct {
		Tool string                 `json:"tool"`
		Args map[string]interface{} `json:"args,omitempty"`
		Key  string                 `json:"key"`
	}

	cases := []struct {
		tool string
		args map[string]interface{}
	}{
		{"get_live_rain_summary", nil},
		{"get_rain_data_by_date", nil},
		{"get_rain_analytics", nil},
		{"get_rain_summary_by_ward", nil},
		{"get_live_water_summary", nil},
		{"get_lake_data_by_date", nil},
		{"get_river_data_by_date", nil},
		{"get_live_inundation_summary", nil},
		{"get_inundation_history_by_range", nil},
		{"get_live_pumping_summary", nil},
		{"get_live_sluice_gate_summary", nil},
		{"get_weather_forecast", nil},
		{"list_stations", map[string]interface{}{"type": "rain"}},
		{"list_stations", map[string]interface{}{"type": "inundation"}},
		{"list_stations", map[string]interface{}{"type": "lake"}},
		{"list_stations", map[string]interface{}{"type": "river"}},
		{"list_stations", nil},
		{"list_stations_by_type", map[string]interface{}{"type": "rain"}},
		{"list_stations_by_type", map[string]interface{}{"type": "lake"}},
		{"get_unfinished_emergency_work_history", nil},
		{"list_emergency_reports", nil},
		{"get_recent_emergency_reports", nil},
		{"get_contract_summary", nil},
		{"get_expiring_contracts", nil},
		{"get_expired_contracts", nil},
		{"get_contract_stages_due_soon", nil},
		{"get_contract_stages_passed", nil},
		{"search_contracts", nil},
		{"get_google_status", nil},
		{"some_unmapped_tool", nil},
	}

	s := &service{}
	out := make([]entry, 0, len(cases))
	for _, c := range cases {
		call := &genai.FunctionCall{Name: c.tool, Args: c.args}
		out = append(out, entry{Tool: c.tool, Args: c.args, Key: s.getToolKey(call)})
	}
	assertGolden(t, "get_tool_key", out)
}

// ---------------------------------------------------------------------------
// tool result -> tables mapping
// ---------------------------------------------------------------------------

// mapChatTableCases enumerates every branch of the mapping switch, keyed by the
// tool that produces each shape. The golden for this set was generated from the
// pre-refactor inline switch in Chat(); it must survive the extraction of
// mapChatTable byte for byte.
func mapChatTableCases() []struct {
	Name string
	Tool string
	Res  interface{}
} {
	return []struct {
		Name string
		Tool string
		Res  interface{}
	}{
		{"pumping_summary_with_wastewater", "get_live_pumping_summary", map[string]interface{}{
			"pumping_stations":    pumpingFixture(),
			"wastewater_stations": []map[string]interface{}{{"name": "NM Yên Sở", "note": "ổn định"}},
		}},
		{"pumping_summary_wrong_shape", "get_live_pumping_summary", "not a map"},
		{"sluice_gates", "get_live_sluice_gate_summary", sluiceGateFixture()},
		{"water_summary_typed", "get_live_water_summary", waterFixture()},
		{"water_summary_fallback", "get_live_water_summary", map[string]interface{}{"raw": "value"}},
		{"rains_typed", "get_live_rain_summary", rainFixture()},
		{"rains_fallback", "get_live_rain_summary", []map[string]interface{}{{"station": "A", "rain": 1.5}}},
		{"default_passthrough", "get_live_inundation_summary", []map[string]interface{}{{"street_name": "Phan Bội Châu"}}},
	}
}

func TestGoldenMapChatTable(t *testing.T) {
	// Pin the rain day so golden output does not move with the calendar.
	restore := currentRainDate
	currentRainDate = func() string { return goldenRainDate }
	t.Cleanup(func() { currentRainDate = restore })

	s := &service{}
	out := make(map[string]interface{})
	for _, c := range mapChatTableCases() {
		tables := make(map[string]interface{})
		s.mapChatTable(tables, &genai.FunctionCall{Name: c.Tool}, c.Res)
		out[c.Name] = tables
	}

	// An empty table key must drop the payload rather than store it under "".
	empty := make(map[string]interface{})
	s.mapChatTable(empty, &genai.FunctionCall{Name: ""}, map[string]interface{}{"dropped": true})
	out["empty_key_ignored"] = empty

	assertGolden(t, "map_chat_table", out)
}

// TestGoldenMapContractTable pins the contract mapping, which stores results
// verbatim under the tool's key with no reshaping.
func TestGoldenMapContractTable(t *testing.T) {
	s := &service{}
	out := make(map[string]interface{})

	tables := make(map[string]interface{})
	s.mapContractTable(tables, &genai.FunctionCall{Name: "get_contract_summary"},
		[]map[string]interface{}{{"code": "HD-01", "value": 1500000}})
	out["contracts"] = tables

	empty := make(map[string]interface{})
	s.mapContractTable(empty, &genai.FunctionCall{Name: ""}, map[string]interface{}{"dropped": true})
	out["empty_key_ignored"] = empty

	assertGolden(t, "map_contract_table", out)
}
