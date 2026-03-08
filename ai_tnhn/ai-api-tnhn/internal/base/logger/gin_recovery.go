package logger

import (
	"ai-api-tnhn/utils/web"
	"fmt"
	"net/http"
	"runtime/debug"

	"github.com/gin-gonic/gin"
)

func (l log) GinRecovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {

				reqID, _ := c.Get("request_id")

				l.Logger.WithFields(map[string]interface{}{
					"request_id": reqID,
					"panic":      err,
					"stack":      string(debug.Stack()),
					"path":       c.Request.URL.Path,
					"method":     c.Request.Method,
				}).Error("PANIC_RECOVERED")
				js := web.JsonRender{}
				if httpError, ok := err.(web.IHttpError); ok {
					js.SendErrorForce(c, err.(error), httpError.StatusCode())
				} else {
					fmt.Println(string(debug.Stack()))
					js.SendErrorForce(c, err.(error), http.StatusInternalServerError)
				}
			}
		}()

		c.Next()
	}
}
