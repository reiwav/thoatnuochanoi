package logger

import (
	"bytes"
	"io"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func (l log) GinLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// ===== Request ID =====
		reqID := c.GetHeader("X-Request-Id")
		if reqID == "" {
			reqID = uuid.NewString()
		}
		c.Set("request_id", reqID)
		c.Writer.Header().Set("X-Request-Id", reqID)

		// ===== Read request body =====
		var reqBody []byte
		if c.Request.Body != nil {
			body, _ := io.ReadAll(c.Request.Body)
			if len(body) > l.MaxBodyLogSize {
				reqBody = body[:l.MaxBodyLogSize]
			} else {
				reqBody = body
			}
			c.Request.Body = io.NopCloser(bytes.NewBuffer(body))
		}

		// ===== Capture response =====
		blw := &bodyLogWriter{
			ResponseWriter: c.Writer,
			body:           bytes.NewBufferString(""),
		}
		c.Writer = blw

		c.Next()

		latency := time.Since(start)

		l.Logger.WithFields(map[string]interface{}{
			"request_id": reqID,
			"status":     c.Writer.Status(),
			"method":     c.Request.Method,
			"path":       c.Request.URL.Path,
			"query":      c.Request.URL.RawQuery,
			"ip":         c.ClientIP(),
			"user_agent": c.Request.UserAgent(),
			"latency_ms": latency.Milliseconds(),
			"req_body":   string(reqBody),
			"res_body":   l.truncate(blw.body.String()),
		}).Info("HTTP_REQUEST")
	}
}

type bodyLogWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w *bodyLogWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

func (l log) truncate(s string) string {
	if len(s) > l.MaxBodyLogSize {
		return s[:l.MaxBodyLogSize]
	}
	return s
}
