package gemini

import (
	"testing"
)

func TestGroupInundationReports(t *testing.T) {
	t.Run("repeat reports at one point collapse into a single group", func(t *testing.T) {
		reports := []map[string]interface{}{
			{"point_id": "p1", "street_name": "Phan Bội Châu", "org_id": "o1", "depth": 0.15, "status": "resolved", "created_at": int64(1000), "flood_level_color": "#FFAA00", "flood_level_name": "Ngập nhẹ"},
			{"point_id": "p1", "street_name": "Phan Bội Châu", "org_id": "o1", "depth": 0.45, "status": "active", "created_at": int64(3000)},
			{"point_id": "p1", "street_name": "Phan Bội Châu", "org_id": "o1", "depth": 0.30, "status": "resolved", "created_at": int64(2000)},
		}

		groups := groupInundationReports(reports)
		if len(groups) != 1 {
			t.Fatalf("expected 1 group, got %d", len(groups))
		}
		g := groups[0]
		if g.count != 3 {
			t.Errorf("count = %d, want 3", g.count)
		}
		if g.maxDepth != 0.45 {
			t.Errorf("maxDepth = %v, want 0.45", g.maxDepth)
		}
		if g.mostRecentTime != 3000 {
			t.Errorf("mostRecentTime = %d, want 3000", g.mostRecentTime)
		}
		if !g.hasActive {
			t.Error("hasActive should be true when any report is active")
		}
		// Only the first report carried severity; it must not be lost.
		if g.color != "#FFAA00" || g.levelName != "Ngập nhẹ" {
			t.Errorf("severity lost: color=%q level=%q", g.color, g.levelName)
		}
	})

	t.Run("distinct points stay separate and keep first-seen order", func(t *testing.T) {
		reports := []map[string]interface{}{
			{"point_id": "p2", "street_name": "B", "created_at": int64(1)},
			{"point_id": "p1", "street_name": "A", "created_at": int64(2)},
			{"point_id": "p2", "street_name": "B", "created_at": int64(3)},
		}
		groups := groupInundationReports(reports)
		if len(groups) != 2 {
			t.Fatalf("expected 2 groups, got %d", len(groups))
		}
		if groups[0].pointID != "p2" || groups[1].pointID != "p1" {
			t.Errorf("order not preserved: %q then %q", groups[0].pointID, groups[1].pointID)
		}
	})

	t.Run("legacy rows without point_id group by street name", func(t *testing.T) {
		reports := []map[string]interface{}{
			{"street_name": "Nguyễn Khuyến", "created_at": int64(1)},
			{"street_name": "Nguyễn Khuyến", "created_at": int64(2)},
		}
		groups := groupInundationReports(reports)
		if len(groups) != 1 {
			t.Fatalf("expected 1 group, got %d", len(groups))
		}
		if groups[0].count != 2 {
			t.Errorf("count = %d, want 2", groups[0].count)
		}
	})

	t.Run("missing depth and created_at are treated as zero", func(t *testing.T) {
		groups := groupInundationReports([]map[string]interface{}{
			{"point_id": "p1"},
		})
		if len(groups) != 1 {
			t.Fatalf("expected 1 group, got %d", len(groups))
		}
		if groups[0].maxDepth != 0 || groups[0].mostRecentTime != 0 {
			t.Errorf("expected zeros, got depth=%v time=%d", groups[0].maxDepth, groups[0].mostRecentTime)
		}
	})

	t.Run("float created_at from json decoding is accepted", func(t *testing.T) {
		groups := groupInundationReports([]map[string]interface{}{
			{"point_id": "p1", "created_at": float64(1772000000), "depth": float64(1.25)},
		})
		if groups[0].mostRecentTime != 1772000000 {
			t.Errorf("mostRecentTime = %d, want 1772000000", groups[0].mostRecentTime)
		}
		if groups[0].maxDepth != 1.25 {
			t.Errorf("maxDepth = %v, want 1.25", groups[0].maxDepth)
		}
	})
}

func TestRenderInundationGroup(t *testing.T) {
	t.Run("active group reports ongoing flooding with max depth", func(t *testing.T) {
		g := &reportGroup{pointID: "p1", streetName: "Phan Bội Châu", count: 3, maxDepth: 0.45, hasActive: true, color: "#FF0000", mostRecentTime: 1772000000}
		doc := renderInundationGroup(g, "Xí nghiệp 1", "2026-03-01", "2026-03-07")

		checks := map[string]interface{}{
			"point_id":         "p1",
			"street_name":      "Phan Bội Châu",
			"org_name":         "Xí nghiệp 1",
			"count":            3,
			"current_status":   "Đang ngập (3 lần)",
			"duration":         "3 lần",
			"formatted_depth":  "Max: 0.45m",
			"color":            "#FF0000",
			"query_start_date": "2026-03-01",
			"query_end_date":   "2026-03-07",
		}
		for k, want := range checks {
			if doc[k] != want {
				t.Errorf("%s = %v, want %v", k, doc[k], want)
			}
		}
		if doc["start_time"] == nil {
			t.Error("start_time should be set when mostRecentTime > 0")
		}
	})

	t.Run("resolved group with unknown depth", func(t *testing.T) {
		g := &reportGroup{pointID: "p2", streetName: "Nguyễn Khuyến", count: 1}
		doc := renderInundationGroup(g, "Xí nghiệp 2", "2026-03-01", "2026-03-07")

		if doc["current_status"] != "Đã rút (1 lần)" {
			t.Errorf("current_status = %v", doc["current_status"])
		}
		if doc["formatted_depth"] != "chưa rõ độ sâu" {
			t.Errorf("formatted_depth = %v", doc["formatted_depth"])
		}
		// Absent rather than empty, so the frontend can fall back to a default.
		if _, present := doc["color"]; present {
			t.Error("color should be omitted when empty")
		}
		if _, present := doc["start_time"]; present {
			t.Error("start_time should be omitted when there is no timestamp")
		}
	})
}

func TestMatchesOrg(t *testing.T) {
	const full = "xí nghiệp thoát nước số 2"

	for _, q := range []string{
		"xí nghiệp thoát nước số 2", // exact
		"xí nghiệp 2",               // shorthand
		"xn2",                       // abbreviation
		"xn 2",                      // abbreviation with space
	} {
		if !matchesOrg(full, q) {
			t.Errorf("matchesOrg(%q, %q) = false, want true", full, q)
		}
	}

	if matchesOrg(full, "xí nghiệp 3") {
		t.Error("a different unit number must not match")
	}
}
