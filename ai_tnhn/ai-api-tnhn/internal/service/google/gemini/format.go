package gemini

// Post-processing for raw database results before they reach the model.
//
// Documents come back as untyped maps holding Unix seconds, which a language
// model reads as meaningless large integers. These helpers rewrite anything that
// looks like a timestamp into a readable local-time string.

import (
	"strings"
	"time"

	"ai-api-tnhn/utils"
)

// timeLayoutFull is the layout used when expanding a Unix timestamp in place.
const timeLayoutFull = "02-01-2006 15:04:05"

// Plausible Unix-second bounds (2020-01-01 .. 2035-01-01). Numbers outside this
// window are left alone, so ids, counts and measurements are not mangled into
// dates by accident.
const (
	minPlausibleUnix int64 = 1577836800
	maxPlausibleUnix int64 = 2051222400
)

// timestampKeywords are the field-name fragments that mark a value as a time.
//
// This is a name-based heuristic, which is necessary because the schema stores
// times three different ways (int64 Unix seconds, time.Time, and pre-formatted
// strings) with no shared marker to key off.
var timestampKeywords = []string{
	"time", "date", "created", "updated", "start", "end",
	"ngay", "ngày", "gio", "giờ", "thoi", "thời", "timestamp",
	"lúc", "luc", "hạn", "han", "phút", "phut", "giây", "giay",
}

// isTimestampKey reports whether a field name suggests it holds a time.
func isTimestampKey(key string) bool {
	k := strings.ToLower(key)
	for _, kw := range timestampKeywords {
		if strings.Contains(k, kw) {
			return true
		}
	}
	// "at" is too short to substring-match safely, so it is matched only as a
	// whole word or as a prefix/suffix (created_at, at_time, ...).
	if k == "at" || strings.HasSuffix(k, "_at") || strings.HasSuffix(k, " at") || strings.Contains(k, " at ") || strings.HasPrefix(k, "at_") || strings.HasPrefix(k, "at ") {
		return true
	}
	return false
}

// formatTimestampsInResult walks a decoded result and expands timestamp-looking
// fields in place. Once a key is treated as a timestamp its value is not
// descended into further.
func formatTimestampsInResult(res interface{}) {
	var walk func(interface{})
	walk = func(node interface{}) {
		if node == nil {
			return
		}
		switch val := node.(type) {
		case map[string]interface{}:
			for k, v := range val {
				if isTimestampKey(k) {
					val[k] = formatUnixTimestamp(v)
				} else {
					walk(v)
				}
			}
		case []interface{}:
			for _, item := range val {
				walk(item)
			}
		case []map[string]interface{}:
			for _, item := range val {
				walk(item)
			}
		}
	}
	walk(res)
}

// formatUnixTimestamp renders a Unix-second value as local time.
//
// Non-numeric values and numbers outside the plausible range are returned
// unchanged; zero or negative becomes a dash, which reads better than "1970".
func formatUnixTimestamp(val interface{}) interface{} {
	timestamp, ok := toInt64(val)
	if !ok {
		return val
	}
	if timestamp <= 0 {
		return "-"
	}
	if timestamp >= minPlausibleUnix && timestamp <= maxPlausibleUnix {
		return time.Unix(timestamp, 0).In(utils.VietnamLocation).Format(timeLayoutFull)
	}
	return val
}

// toInt64 coerces the numeric types the Mongo driver and JSON decoding produce.
// The bool result distinguishes "not a number" from a genuine zero.
func toInt64(val interface{}) (int64, bool) {
	switch v := val.(type) {
	case int64:
		return v, true
	case int:
		return int64(v), true
	case int32:
		return int64(v), true
	case float64:
		return int64(v), true
	}
	return 0, false
}

// getInt64Value coerces a value to int64, yielding 0 when it is not numeric.
func getInt64Value(val interface{}) int64 {
	n, _ := toInt64(val)
	return n
}

// getFloat64Value coerces a value to float64, yielding 0 when it is not numeric.
func getFloat64Value(val interface{}) float64 {
	switch v := val.(type) {
	case float64:
		return v
	case float32:
		return float64(v)
	case int64:
		return float64(v)
	case int:
		return float64(v)
	}
	return 0
}
