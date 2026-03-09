package handler

import (
	"ai-api-tnhn/internal/service/weather"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockWeatherService is a mock for weather.Service
type MockWeatherService struct {
	mock.Mock
}

func (m *MockWeatherService) GetRawRainData(ctx context.Context) (*weather.RainDataResponse, error) {
	args := m.Called(ctx)
	if args.Get(0) != nil {
		return args.Get(0).(*weather.RainDataResponse), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockWeatherService) GetRawWaterData(ctx context.Context) (*weather.WaterDataResponse, error) {
	args := m.Called(ctx)
	if args.Get(0) != nil {
		return args.Get(0).(*weather.WaterDataResponse), args.Error(1)
	}
	return nil, args.Error(1)
}

func TestWeatherHandler_GetRainSummary(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockSvc := new(MockWeatherService)
	handler := NewWeatherHandler(mockSvc)

	mockResponse := &weather.RainDataResponse{
		Code: 200,
	}
	mockResponse.Content.Tram = []struct {
		Id        interface{} `json:"Id"`
		TenTram   string      `json:"TenTram"`
		TenPhuong string      `json:"TenPhuong"`
	}{}
	mockResponse.Content.Data = []struct {
		TramId      interface{} `json:"TramId"`
		LuongMua_BD float64     `json:"LuongMua_BD"`
		ThoiGian_BD string      `json:"ThoiGian_BD"`
		LuongMua_HT float64     `json:"LuongMua_HT"`
		ThoiGian_HT string      `json:"ThoiGian_HT"`
	}{}
	mockSvc.On("GetRawRainData", mock.Anything).Return(mockResponse, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	// Create a dummy request to provide a context
	req, _ := http.NewRequest("GET", "/api/admin/weather/rain", nil)
	c.Request = req

	handler.GetRainSummary(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "success", response["status"])
	dataObj, ok := response["data"].(map[string]interface{})
	assert.True(t, ok, "data should be an object")
	assert.NotNil(t, dataObj["tram"])
	assert.NotNil(t, dataObj["data"])
	mockSvc.AssertExpectations(t)
}

func TestWeatherHandler_GetWaterSummary(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockSvc := new(MockWeatherService)
	handler := NewWeatherHandler(mockSvc)

	mockResponse := &weather.WaterDataResponse{
		Code: 200,
	}
	mockResponse.Content.Tram = []struct {
		Id          string `json:"Id"`
		TenTram     string `json:"TenTram"`
		TenTramHTML string `json:"TenTramHTML"`
		Loai        string `json:"Loai"`
	}{}
	mockResponse.Content.Data = []struct {
		TramId       string  `json:"TramId"`
		ThuongLuu_HT float64 `json:"ThuongLuu_HT"`
		ThoiGian_HT  string  `json:"ThoiGian_HT"`
		Loai         int     `json:"Loai"`
	}{}
	mockSvc.On("GetRawWaterData", mock.Anything).Return(mockResponse, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	req, _ := http.NewRequest("GET", "/api/admin/weather/water", nil)
	c.Request = req

	handler.GetWaterSummary(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "success", response["status"])
	dataObj, ok := response["data"].(map[string]interface{})
	assert.True(t, ok, "data should be an object")
	assert.NotNil(t, dataObj["tram"])
	assert.NotNil(t, dataObj["data"])
	mockSvc.AssertExpectations(t)
}
