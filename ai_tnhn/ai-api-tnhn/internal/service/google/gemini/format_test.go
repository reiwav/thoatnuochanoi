package gemini

import (
	"reflect"
	"testing"
	"time"

	"ai-api-tnhn/utils"
)

func TestFormatUnixTimestamp(t *testing.T) {
	inRange := int64(1772000000) // Feb 2026
	want := time.Unix(inRange, 0).In(utils.VietnamLocation).Format(timeLayoutFull)

	t.Run("plausible timestamps are expanded", func(t *testing.T) {
		for name, val := range map[string]interface{}{
			"int64":   inRange,
			"int":     int(inRange),
			"float64": float64(inRange),
		} {
			if got := formatUnixTimestamp(val); got != want {
				t.Errorf("%s: got %v, want %v", name, got, want)
			}
		}
	})

	t.Run("zero and negative become a dash", func(t *testing.T) {
		for _, val := range []interface{}{int64(0), int64(-1), 0, float64(0)} {
			if got := formatUnixTimestamp(val); got != "-" {
				t.Errorf("%v: got %v, want \"-\"", val, got)
			}
		}
	})

	// Guards the boundaries so ids and measurements are not turned into dates.
	t.Run("numbers outside the plausible window are returned unchanged", func(t *testing.T) {
		for _, val := range []int64{minPlausibleUnix - 1, maxPlausibleUnix + 1, 42, 999999} {
			if got := formatUnixTimestamp(val); got != interface{}(val) {
				t.Errorf("%d: got %v, want unchanged", val, got)
			}
		}
	})

	t.Run("window boundaries are inclusive", func(t *testing.T) {
		for _, val := range []int64{minPlausibleUnix, maxPlausibleUnix} {
			if got := formatUnixTimestamp(val); got == interface{}(val) {
				t.Errorf("%d should have been formatted", val)
			}
		}
	})

	// This is what distinguishes formatUnixTimestamp from getInt64Value: a
	// non-numeric value must survive rather than collapse to 0.
	t.Run("non-numeric values pass through", func(t *testing.T) {
		for _, val := range []interface{}{"2026-03-07", nil, true, []int{1}} {
			if got := formatUnixTimestamp(val); !reflect.DeepEqual(got, val) {
				t.Errorf("%v: got %v, want unchanged", val, got)
			}
		}
	})
}

func TestFormatTimestampsInResult(t *testing.T) {
	ts := int64(1772000000)
	want := time.Unix(ts, 0).In(utils.VietnamLocation).Format(timeLayoutFull)

	res := []map[string]interface{}{{
		"created_at":  ts,
		"street_name": "Phan Bội Châu",
		"count":       7,
		"nested": map[string]interface{}{
			"end_time": ts,
			"depth":    0.45,
		},
		"list": []interface{}{
			map[string]interface{}{"updated_at": ts},
		},
	}}

	formatTimestampsInResult(res)

	if res[0]["created_at"] != want {
		t.Errorf("created_at = %v, want %v", res[0]["created_at"], want)
	}
	if res[0]["street_name"] != "Phan Bội Châu" {
		t.Error("non-timestamp field was modified")
	}
	if res[0]["count"] != 7 {
		t.Error("a plain count must not be reinterpreted as a date")
	}
	nested := res[0]["nested"].(map[string]interface{})
	if nested["end_time"] != want {
		t.Errorf("nested end_time = %v, want %v", nested["end_time"], want)
	}
	if nested["depth"] != 0.45 {
		t.Error("nested non-timestamp field was modified")
	}
	inList := res[0]["list"].([]interface{})[0].(map[string]interface{})
	if inList["updated_at"] != want {
		t.Errorf("updated_at inside a list = %v, want %v", inList["updated_at"], want)
	}
}

func TestIsTimestampKey(t *testing.T) {
	for _, k := range []string{
		"created_at", "updated_at", "timestamp", "start_time", "end_time",
		"report_date", "ngay_bao_cao", "thời gian", "giờ", "at", "at_time", "han_hoan_thanh",
	} {
		if !isTimestampKey(k) {
			t.Errorf("%q should be treated as a timestamp key", k)
		}
	}

	for _, k := range []string{
		"street_name", "depth", "count", "org_id", "status", "color", "point_id",
	} {
		if isTimestampKey(k) {
			t.Errorf("%q should NOT be treated as a timestamp key", k)
		}
	}
}

func TestNumericCoercion(t *testing.T) {
	t.Run("toInt64 reports whether the value was numeric", func(t *testing.T) {
		if n, ok := toInt64(int32(5)); n != 5 || !ok {
			t.Errorf("toInt64(int32(5)) = %d, %v", n, ok)
		}
		if n, ok := toInt64("5"); n != 0 || ok {
			t.Errorf("toInt64(\"5\") = %d, %v; want 0, false", n, ok)
		}
	})

	t.Run("getInt64Value collapses non-numerics to zero", func(t *testing.T) {
		cases := map[interface{}]int64{
			int64(7): 7, int(7): 7, int32(7): 7, float64(7.9): 7,
			"7": 0, nil: 0, true: 0,
		}
		for in, want := range cases {
			if got := getInt64Value(in); got != want {
				t.Errorf("getInt64Value(%v) = %d, want %d", in, got, want)
			}
		}
	})

	t.Run("getFloat64Value handles the numeric types mongo returns", func(t *testing.T) {
		cases := map[interface{}]float64{
			float64(1.5): 1.5, float32(2.5): 2.5, int64(3): 3, int(4): 4,
			"5": 0, nil: 0,
		}
		for in, want := range cases {
			if got := getFloat64Value(in); got != want {
				t.Errorf("getFloat64Value(%v) = %v, want %v", in, got, want)
			}
		}
	})
}

func TestExtractDates(t *testing.T) {
	t.Run("finds dates in nested filters, deduplicated in order", func(t *testing.T) {
		in := map[string]interface{}{
			"created_at": map[string]interface{}{
				"$gte": "2026-03-01",
				"$lte": "2026-03-07",
			},
			"note": "so sánh với 2026-03-01",
		}
		got := extractDates(in)
		if len(got) != 2 {
			t.Fatalf("expected 2 distinct dates, got %v", got)
		}
		seen := map[string]bool{got[0]: true, got[1]: true}
		if !seen["2026-03-01"] || !seen["2026-03-07"] {
			t.Errorf("missing expected dates: %v", got)
		}
	})

	t.Run("finds a date embedded in a longer timestamp string", func(t *testing.T) {
		got := extractDates("2026-03-07T11:30:00Z")
		if !reflect.DeepEqual(got, []string{"2026-03-07"}) {
			t.Errorf("got %v, want [2026-03-07]", got)
		}
	})

	t.Run("ignores strings that only look like dates", func(t *testing.T) {
		for _, s := range []string{"2026/03/07", "20260307", "abcd-ef-gh", "2026-03"} {
			if got := extractDates(s); len(got) != 0 {
				t.Errorf("extractDates(%q) = %v, want none", s, got)
			}
		}
	})

	t.Run("walks time.Time values", func(t *testing.T) {
		when := time.Date(2026, 3, 7, 11, 30, 0, 0, time.UTC)
		got := extractDates(map[string]interface{}{"ts": when})
		if len(got) != 1 || got[0] != utils.FormatDate(when) {
			t.Errorf("got %v, want [%s]", got, utils.FormatDate(when))
		}
	})

	t.Run("nil and empty input are safe", func(t *testing.T) {
		if got := extractDates(nil); len(got) != 0 {
			t.Errorf("extractDates(nil) = %v", got)
		}
	})
}
