package web

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type JsonRender struct {
}

func (r *JsonRender) SendData(ctx *gin.Context, data interface{}) {
	ctx.JSON(http.StatusOK, map[string]interface{}{
		"data":   data,
		"status": "success",
		"code":   200,
	})
}

func (r *JsonRender) SendErrorForce(ctx *gin.Context, err error, statusCode int) {
	ctx.JSON(statusCode, map[string]interface{}{
		"error":  err.Error(),
		"status": "error",
		"code":   statusCode,
	})
}

func (r *JsonRender) SendString(ctx *gin.Context, data interface{}) {
	ctx.JSON(http.StatusOK, data)
}

func (r *JsonRender) SendDataNotFound(ctx *gin.Context, data interface{}, isNotFound bool) {
	var status = "success"
	if isNotFound {
		status = "error"
	}
	ctx.JSON(http.StatusOK, map[string]interface{}{
		"error":  data,
		"status": status,
		"code":   200,
	})
}

func (r *JsonRender) SendError(ctx *gin.Context, err error) {
	ctx.JSON(http.StatusOK, map[string]interface{}{
		"error":  err.Error(),
		"status": "error",
		"code":   200,
	})
}

func (r *JsonRender) Success(ctx *gin.Context) {
	ctx.JSON(http.StatusOK, map[string]interface{}{
		"data":   nil,
		"status": "success",
		"code":   200,
	})
}
