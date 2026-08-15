package gemini

import (
	"context"
	"errors"
	"testing"

	"ai-api-tnhn/internal/constant"

	"github.com/google/generative-ai-go/genai"
)

func TestArgAccessors(t *testing.T) {
	// Gemini delivers every number as float64; the int forms are accepted so
	// hand-built calls behave the same.
	args := map[string]interface{}{
		"str":     "hello",
		"f64":     float64(42.7),
		"i":       int(7),
		"i64":     int64(8),
		"boolean": true,
		"object":  map[string]interface{}{"k": "v"},
		"wrong":   []int{1, 2},
	}

	t.Run("present values of the right type", func(t *testing.T) {
		if v, ok := argStr(args, "str"); v != "hello" || !ok {
			t.Errorf("argStr = %q, %v", v, ok)
		}
		if v, ok := argFloat(args, "f64"); v != 42.7 || !ok {
			t.Errorf("argFloat = %v, %v", v, ok)
		}
		if v, ok := argInt(args, "f64"); v != 42 || !ok {
			t.Errorf("argInt should truncate: got %v, %v", v, ok)
		}
		if v, ok := argInt(args, "i"); v != 7 || !ok {
			t.Errorf("argInt(int) = %v, %v", v, ok)
		}
		if v, ok := argInt(args, "i64"); v != 8 || !ok {
			t.Errorf("argInt(int64) = %v, %v", v, ok)
		}
		if v, ok := argBool(args, "boolean"); !v || !ok {
			t.Errorf("argBool = %v, %v", v, ok)
		}
		if v, ok := argMap(args, "object"); v["k"] != "v" || !ok {
			t.Errorf("argMap = %v, %v", v, ok)
		}
	})

	t.Run("absent and mistyped values report not-ok instead of panicking", func(t *testing.T) {
		if _, ok := argStr(args, "missing"); ok {
			t.Error("argStr on a missing key should report not-ok")
		}
		if _, ok := argStr(args, "f64"); ok {
			t.Error("argStr on a number should report not-ok")
		}
		if _, ok := argInt(args, "str"); ok {
			t.Error("argInt on a string should report not-ok")
		}
		if _, ok := argBool(args, "str"); ok {
			t.Error("argBool on a string should report not-ok")
		}
		if _, ok := argMap(args, "wrong"); ok {
			t.Error("argMap on a slice should report not-ok")
		}
	})

	t.Run("defaults", func(t *testing.T) {
		if v := strOr(args, "missing", "fallback"); v != "fallback" {
			t.Errorf("strOr = %q", v)
		}
		if v := intOr(args, "missing", 30); v != 30 {
			t.Errorf("intOr = %d", v)
		}
		if v := boolOr(args, "missing", true); !v {
			t.Errorf("boolOr = %v", v)
		}
		// A present value must win over the default.
		if v := strOr(args, "str", "fallback"); v != "hello" {
			t.Errorf("strOr should prefer the present value, got %q", v)
		}
	})

	t.Run("required accessors", func(t *testing.T) {
		if _, err := requireStr(args, "str"); err != nil {
			t.Errorf("requireStr on a valid value: %v", err)
		}
		if _, err := requireStr(args, "missing"); err == nil {
			t.Error("requireStr on a missing key should error")
		}
		// An empty string is as unusable as an absent one.
		if _, err := requireStr(map[string]interface{}{"k": ""}, "k"); err == nil {
			t.Error("requireStr on an empty string should error")
		}
		if _, err := requireInt(args, "missing"); err == nil {
			t.Error("requireInt on a missing key should error")
		}
	})

	t.Run("callArgs never returns nil", func(t *testing.T) {
		if got := callArgs(nil); got == nil {
			t.Error("callArgs(nil) should return an empty map")
		}
		if got := callArgs(&genai.FunctionCall{Name: "x"}); got == nil {
			t.Error("callArgs with nil Args should return an empty map")
		}
		// Reading from the result must be safe.
		if _, ok := argStr(callArgs(nil), "anything"); ok {
			t.Error("lookup on empty args should report not-ok")
		}
	})
}

// TestToolCallsWithMissingArgsDoNotPanic is the regression test for the crash
// this change fixes: the model may omit any argument that is not declared
// Required, and a bare type assertion on the missing value took the process down
// with it.
//
// The service is deliberately zero-valued. Every tool listed here must reject
// the call on its arguments before it reaches a dependency.
func TestToolCallsWithMissingArgsDoNotPanic(t *testing.T) {
	s := &service{}
	scope := dataScope{UserID: "u-1"}

	tools := []string{
		constant.ToolReadEmailByTitle,
		constant.ToolReadEmailByID,
		constant.ToolListStations,
		constant.ToolDatabaseQuery,
		constant.ToolDatabaseAggregate,
		constant.ToolReportEmergencyProgress,
		constant.ToolEmergencyHistory,
	}

	for _, tool := range tools {
		t.Run(tool, func(t *testing.T) {
			defer func() {
				if r := recover(); r != nil {
					t.Fatalf("panicked on missing args: %v", r)
				}
			}()
			res, err := s.handleToolCall(context.Background(), &genai.FunctionCall{Name: tool}, scope)
			if err == nil {
				t.Errorf("expected an error for missing args, got result %v", res)
			}
		})
	}
}

func TestContractToolCallsWithMissingArgsDoNotPanic(t *testing.T) {
	s := &service{}
	defer func() {
		if r := recover(); r != nil {
			t.Fatalf("panicked on missing args: %v", r)
		}
	}()
	if _, err := s.handleContractToolCall(context.Background(), &genai.FunctionCall{Name: constant.ToolSearchContracts}); err == nil {
		t.Error("search_contracts without a keyword should error")
	}
}

func TestUnknownToolIsRejected(t *testing.T) {
	s := &service{}
	if _, err := s.handleToolCall(context.Background(), &genai.FunctionCall{Name: "no_such_tool"}, dataScope{}); err == nil {
		t.Error("an unknown tool should error")
	}
	if _, err := s.handleContractToolCall(context.Background(), &genai.FunctionCall{Name: "no_such_tool"}); err == nil {
		t.Error("an unknown contract tool should error")
	}
}

// TestSafeDispatchContainsPanics covers the backstop: even if a handler panics
// for a reason the argument accessors cannot prevent (a nil dependency, a bad
// index), it must surface as a tool error rather than crash the process.
func TestSafeDispatchContainsPanics(t *testing.T) {
	t.Run("nil dereference becomes an error", func(t *testing.T) {
		panicking := func(ctx context.Context, c *genai.FunctionCall) (interface{}, error) {
			var m map[string]int
			m["boom"] = 1 // assignment to entry in nil map
			return nil, nil
		}
		res, err := safeDispatch(context.Background(), panicking, &genai.FunctionCall{Name: "exploding_tool"})
		if err == nil {
			t.Fatal("expected an error from the recovered panic")
		}
		if res != nil {
			t.Errorf("result should be nil after a panic, got %v", res)
		}
	})

	t.Run("successful dispatch is passed through untouched", func(t *testing.T) {
		ok := func(ctx context.Context, c *genai.FunctionCall) (interface{}, error) {
			return "fine", nil
		}
		res, err := safeDispatch(context.Background(), ok, &genai.FunctionCall{Name: "good_tool"})
		if err != nil || res != "fine" {
			t.Errorf("got %v, %v; want \"fine\", nil", res, err)
		}
	})

	t.Run("ordinary errors are passed through unchanged", func(t *testing.T) {
		sentinel := errors.New("upstream unavailable")
		failing := func(ctx context.Context, c *genai.FunctionCall) (interface{}, error) {
			return nil, sentinel
		}
		_, err := safeDispatch(context.Background(), failing, &genai.FunctionCall{Name: "failing_tool"})
		if !errors.Is(err, sentinel) {
			t.Errorf("error was not passed through: %v", err)
		}
	})
}
