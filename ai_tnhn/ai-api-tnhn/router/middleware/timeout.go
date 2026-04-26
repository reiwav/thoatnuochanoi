package middleware

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// TimeoutMiddleware wraps each request in a context with a specified timeout.
func (m mid) TimeoutMiddleware(timeout time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Create a context with timeout
		ctx, cancel := context.WithTimeout(c.Request.Context(), timeout)
		defer cancel()

		// Replace the request context with the timed one
		c.Request = c.Request.WithContext(ctx)

		// Channel to notify when the request is done
		finished := make(chan struct{})
		
		// Run the next handlers in the chain
		go func() {
			c.Next()
			finished <- struct{}{}
		}()

		select {
		case <-finished:
			// Request finished on time
			return
		case <-ctx.Done():
			// Timeout reached
			if ctx.Err() == context.DeadlineExceeded {
				c.AbortWithStatusJSON(http.StatusGatewayTimeout, gin.H{
					"message": "Yêu cầu xử lý quá lâu (Timeout)",
				})
			}
		}
	}
}
