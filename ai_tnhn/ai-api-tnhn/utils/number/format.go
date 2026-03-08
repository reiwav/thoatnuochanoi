package number

import (
	"fmt"
	"reflect"
	"regexp"
	"strconv"
	"strings"

	"golang.org/x/text/language"
	"golang.org/x/text/message"
)

var (
	// Matches numbers like 1234 or 1234.56
	// We use a regex that catches sequences of 4 or more digits to avoid formatting years like 2024,
	// or we just catch all and format.
	// Let's catch all digit sequences of 4 or more, or decimal numbers.
	numRegex = regexp.MustCompile(`\b\d{4,}(\.\d+)?\b`)
)

// Format formats an integer with thousand separators (comma).
func Format(v int64) string {
	p := message.NewPrinter(language.English)
	return p.Sprintf("%d", v)
}

// FormatFloat formats a float with thousand separators and 1 decimal place.
func FormatFloat(v float64) string {
	p := message.NewPrinter(language.English)
	return p.Sprintf("%.1f", v)
}

// FormatDecimal formats a float with thousand separators and specified precision.
func FormatDecimal(v float64, precision int) string {
	p := message.NewPrinter(language.English)
	format := "%." + fmt.Sprintf("%d", precision) + "f"
	return p.Sprintf(format, v)
}

// FormatText finds all numbers in a string and adds thousand separators.
func FormatText(text string) string {
	return numRegex.ReplaceAllStringFunc(text, func(m string) string {
		// Try to parse as float
		if strings.Contains(m, ".") {
			v, err := strconv.ParseFloat(m, 64)
			if err != nil {
				return m
			}
			return FormatFloat(v)
		}

		// Try to parse as int
		v, err := strconv.ParseInt(m, 10, 64)
		if err != nil {
			return m
		}
		return Format(v)
	})
}

// FormatAllNumbers recursively traverses a data structure and formats all numeric values as strings.
// This is useful for preparing data to be displayed in chat interfaces.
func FormatAllNumbers(data interface{}) interface{} {
	if data == nil {
		return nil
	}

	v := reflect.ValueOf(data)
	switch v.Kind() {
	case reflect.Ptr:
		if v.IsNil() {
			return nil
		}
		return FormatAllNumbers(v.Elem().Interface())
	case reflect.Interface:
		if v.IsNil() {
			return nil
		}
		return FormatAllNumbers(v.Elem().Interface())
	case reflect.Map:
		newMap := make(map[string]interface{})
		for _, key := range v.MapKeys() {
			kStr := fmt.Sprintf("%v", key.Interface())
			newMap[kStr] = FormatAllNumbers(v.MapIndex(key).Interface())
		}
		return newMap
	case reflect.Slice, reflect.Array:
		newSlice := make([]interface{}, v.Len())
		for i := 0; i < v.Len(); i++ {
			newSlice[i] = FormatAllNumbers(v.Index(i).Interface())
		}
		return newSlice
	case reflect.Struct:
		newMap := make(map[string]interface{})
		t := v.Type()
		for i := 0; i < v.NumField(); i++ {
			field := t.Field(i)
			if field.PkgPath != "" { // Skip unexported fields
				continue
			}
			name := field.Name
			if jsonTag := field.Tag.Get("json"); jsonTag != "" && jsonTag != "-" {
				name = jsonTag
				for i, c := range name {
					if c == ',' {
						name = name[:i]
						break
					}
				}
			}
			newMap[name] = FormatAllNumbers(v.Field(i).Interface())
		}
		return newMap
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return Format(v.Int())
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return Format(int64(v.Uint()))
	case reflect.Float32, reflect.Float64:
		val := v.Float()
		if val == float64(int64(val)) {
			return Format(int64(val))
		}
		return FormatFloat(val)
	default:
		return data
	}
}
