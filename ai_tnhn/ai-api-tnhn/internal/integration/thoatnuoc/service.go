package thoatnuoc

import (
	"ai-api-tnhn/internal/utils"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type RainDataResponse struct {
	Code    int `json:"Code"`
	Content struct {
		Tram []struct {
			Id        interface{} `json:"Id"` // Can be float64 or string from external API
			TenTram   string      `json:"TenTram"`
			TenPhuong string      `json:"TenPhuong"`
			DiaChi    string      `json:"DiaChi"`
			Lat       string      `json:"Lat"`
			Lng       string      `json:"Lng"`
			ThuTu     int         `json:"ThuTu"`
			ManHinh   int         `json:"ManHinh"`
			PhuongId  int         `json:"PhuongId"`
			Active    bool        `json:"Active"`
		} `json:"tram"`
		Data []struct {
			Id          int         `json:"Id"`
			TramId      interface{} `json:"TramId"` // Can be float64 or string
			LuongMua_BD float64     `json:"LuongMua_BD"`
			ThoiGian_BD string      `json:"ThoiGian_BD"`
			LuongMua_HT float64     `json:"LuongMua_HT"`
			ThoiGian_HT string      `json:"ThoiGian_HT"`
			LuongMua_Tr float64     `json:"LuongMua_Tr"`
			ThoiGian_Tr string      `json:"ThoiGian_Tr"`
			AC          int         `json:"AC"`
		} `json:"data"`
	} `json:"Content"`
}

type WaterDataResponse struct {
	Code    int `json:"Code"`
	Content struct {
		Tram []struct {
			Id          string `json:"Id"`
			TenTram     string `json:"TenTram"`
			TenTramHTML string `json:"TenTramHTML"`
			Loai        string `json:"Loai"` // "1" for River, "2" for Lake
			ThuTu       int    `json:"ThuTu"`
		} `json:"tram"`
		Data []struct {
			TramId       string  `json:"TramId"`
			ThuongLuu_HT float64 `json:"ThuongLuu_HT"`
			ThoiGian_HT  string  `json:"ThoiGian_HT"`
			Loai         int     `json:"Loai"`
		} `json:"data"`
	} `json:"Content"`
}

type RainChartDataResponse struct {
	Data string `json:"Data"`
}

type RainChartDataPoint struct {
	ThoiGian string  `json:"ThoiGian"`
	LuongMua float64 `json:"LuongMua"`
}

type Service interface {
	GetRawRainData(ctx context.Context) (*RainDataResponse, error)
	GetRawWaterData(ctx context.Context) (*WaterDataResponse, error)
	GetRainChartData(ctx context.Context, sessionID string, stationOldID int, date string) ([]RainChartDataPoint, error)
}

type service struct {
	client *http.Client
}

func NewService() Service {
	return &service{
		client: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

func (s *service) GetRawRainData(ctx context.Context) (*RainDataResponse, error) {
	url := "https://noibo.thoatnuochanoi.vn/api/thuytri/getallrain?id=3a1a672f-c56f-4752-b86c-455e30427b87"
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call rain API: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var rainData RainDataResponse
	if err := json.Unmarshal(bodyBytes, &rainData); err != nil {
		return nil, fmt.Errorf("failed to unmarshal rain data: %w", err)
	}

	// Convert UTC timestamps to Vietnam timezone (UTC+7)
	for i := range rainData.Content.Data {
		rainData.Content.Data[i].ThoiGian_BD = utils.ConvertUTCToVietnam(rainData.Content.Data[i].ThoiGian_BD)
		rainData.Content.Data[i].ThoiGian_HT = utils.ConvertUTCToVietnam(rainData.Content.Data[i].ThoiGian_HT)
		rainData.Content.Data[i].ThoiGian_Tr = utils.ConvertUTCToVietnam(rainData.Content.Data[i].ThoiGian_Tr)
	}

	return &rainData, nil
}

func (s *service) GetRawWaterData(ctx context.Context) (*WaterDataResponse, error) {
	url := "https://noibo.thoatnuochanoi.vn/api/thuytri/getallmucnuoc?id=3a1a672f-c56f-4752-b86c-455e30427b87"
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call water API: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var waterData WaterDataResponse
	if err := json.Unmarshal(bodyBytes, &waterData); err != nil {
		return nil, fmt.Errorf("failed to unmarshal water data: %w", err)
	}

	return &waterData, nil
}

func (s *service) GetRainChartData(ctx context.Context, sessionID string, stationOldID int, date string) ([]RainChartDataPoint, error) {
	url := fmt.Sprintf("https://thoatnuochanoi.vn/qlnl/Contains/ajax/phai.ashx?type=solieumua&tram=%d&ngay=%s", stationOldID, date)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Cookie", "ASP.NET_SessionId="+sessionID)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call rain chart API: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if string(bodyBytes) == "{}" || string(bodyBytes) == "{\"Data\":\"[]\"}" {
		return nil, nil
	}

	var apiResponse RainChartDataResponse
	if err := json.Unmarshal(bodyBytes, &apiResponse); err != nil {
		return nil, fmt.Errorf("failed to unmarshal rain chart response: %w", err)
	}

	var dataPoints []RainChartDataPoint
	if err := json.Unmarshal([]byte(apiResponse.Data), &dataPoints); err != nil {
		return nil, fmt.Errorf("failed to unmarshal rain chart data points: %w", err)
	}

	return dataPoints, nil
}
