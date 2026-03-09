package router

import (
	"ai-api-tnhn/handler"
	"ai-api-tnhn/router/middleware"

	"github.com/gin-gonic/gin"
)

func (h *HandlerFuncs) WeatherRoutes(api *gin.RouterGroup, mid middleware.Middleware, weatherHandler *handler.WeatherHandler) {
	weatherGroup := api.Group("/weather")
	weatherGroup.Use(mid.MidBasicType()) // Or equivalent auth middleware used by admin group
	{
		weatherGroup.GET("/rain", weatherHandler.GetRainSummary)
		weatherGroup.GET("/water", weatherHandler.GetWaterSummary)
	}
}
