package gemini

import (
	"strings"
	"testing"
	"unicode/utf8"
)

func TestTruncateForModel(t *testing.T) {
	const suffix = "... (truncated)"

	t.Run("short input is returned unchanged", func(t *testing.T) {
		in := "Trạm Hoàn Kiếm"
		if got := truncateForModel(in, 100); got != in {
			t.Errorf("got %q, want %q", got, in)
		}
	})

	t.Run("input exactly at the limit is unchanged", func(t *testing.T) {
		in := strings.Repeat("a", 50)
		if got := truncateForModel(in, 50); got != in {
			t.Errorf("got len %d, want unchanged len 50", len(got))
		}
	})

	t.Run("ascii is cut at the limit", func(t *testing.T) {
		in := strings.Repeat("a", 60)
		got := truncateForModel(in, 50)
		if want := strings.Repeat("a", 50) + suffix; got != want {
			t.Errorf("got %q, want %q", got, want)
		}
	})

	// The regression this guards: "ữ" is 3 bytes, so a byte-wise cut can land
	// inside it and emit invalid UTF-8 to the model.
	t.Run("multibyte runes are never split", func(t *testing.T) {
		in := strings.Repeat("ữ", 200) // 600 bytes
		for limit := 1; limit <= 60; limit++ {
			got := truncateForModel(in, limit)
			body := strings.TrimSuffix(got, suffix)
			if !utf8.ValidString(body) {
				t.Fatalf("limit %d produced invalid UTF-8: %q", limit, body)
			}
			if len(body) > limit {
				t.Fatalf("limit %d: body is %d bytes, over the limit", limit, len(body))
			}
			if len(body)%3 != 0 {
				t.Fatalf("limit %d: body length %d is not a whole number of runes", limit, len(body))
			}
		}
	})

	t.Run("realistic vietnamese payload stays valid at the real limit", func(t *testing.T) {
		in := strings.Repeat("Trạm bơm Yên Sở đang vận hành, mực nước hồ vượt ngưỡng. ", 2000)
		if len(in) <= maxToolResultBytes {
			t.Fatalf("fixture too small: %d bytes", len(in))
		}
		got := truncateForModel(in, maxToolResultBytes)
		body := strings.TrimSuffix(got, suffix)
		if !utf8.ValidString(body) {
			t.Error("truncated payload is not valid UTF-8")
		}
		if !strings.HasSuffix(got, suffix) {
			t.Error("truncated payload lost its marker")
		}
		if len(body) > maxToolResultBytes {
			t.Errorf("body is %d bytes, over the %d limit", len(body), maxToolResultBytes)
		}
	})
}
