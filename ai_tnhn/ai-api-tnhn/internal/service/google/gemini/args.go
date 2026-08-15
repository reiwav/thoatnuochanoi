package gemini

// Typed access to the arguments Gemini sends with a tool call.
//
// Tool arguments are model output, not validated input: a parameter that is not
// in a declaration's Required list may simply be absent, and even a required one
// can arrive with the wrong type. A bare type assertion on such a value panics,
// and because tool calls run inside an errgroup goroutine that panic takes the
// whole process down rather than failing one request. These helpers return a
// usable zero plus an ok flag instead.

import (
	"fmt"

	"github.com/google/generative-ai-go/genai"
)

// argStr reads a string argument.
func argStr(args map[string]interface{}, key string) (string, bool) {
	v, ok := args[key].(string)
	return v, ok
}

// argFloat reads a numeric argument. JSON numbers decode to float64, but int
// forms are accepted so a hand-built call also works.
func argFloat(args map[string]interface{}, key string) (float64, bool) {
	switch v := args[key].(type) {
	case float64:
		return v, true
	case float32:
		return float64(v), true
	case int64:
		return float64(v), true
	case int:
		return float64(v), true
	}
	return 0, false
}

// argInt reads a numeric argument as an int, truncating any fraction.
func argInt(args map[string]interface{}, key string) (int, bool) {
	f, ok := argFloat(args, key)
	return int(f), ok
}

// argBool reads a boolean argument.
func argBool(args map[string]interface{}, key string) (bool, bool) {
	v, ok := args[key].(bool)
	return v, ok
}

// argMap reads an object argument.
func argMap(args map[string]interface{}, key string) (map[string]interface{}, bool) {
	v, ok := args[key].(map[string]interface{})
	return v, ok
}

// strOr reads a string argument, falling back to def when absent or mistyped.
func strOr(args map[string]interface{}, key, def string) string {
	if v, ok := argStr(args, key); ok {
		return v
	}
	return def
}

// intOr reads an int argument, falling back to def when absent or mistyped.
func intOr(args map[string]interface{}, key string, def int) int {
	if v, ok := argInt(args, key); ok {
		return v
	}
	return def
}

// boolOr reads a bool argument, falling back to def when absent or mistyped.
func boolOr(args map[string]interface{}, key string, def bool) bool {
	if v, ok := argBool(args, key); ok {
		return v
	}
	return def
}

// requireStr reads a string argument the tool cannot run without, returning an
// error the model can read and retry from.
func requireStr(args map[string]interface{}, key string) (string, error) {
	v, ok := argStr(args, key)
	if !ok || v == "" {
		return "", missingArgError(key)
	}
	return v, nil
}

// requireInt reads a numeric argument the tool cannot run without.
func requireInt(args map[string]interface{}, key string) (int, error) {
	v, ok := argInt(args, key)
	if !ok {
		return 0, missingArgError(key)
	}
	return v, nil
}

// missingArgError phrases the failure so the model knows what to supply.
func missingArgError(key string) error {
	return fmt.Errorf("thiếu tham số bắt buộc '%s', vui lòng cung cấp giá trị hợp lệ", key)
}

// callArgs returns a call's arguments, never nil, so lookups on a call with no
// arguments are safe.
func callArgs(c *genai.FunctionCall) map[string]interface{} {
	if c == nil || c.Args == nil {
		return map[string]interface{}{}
	}
	return c.Args
}
