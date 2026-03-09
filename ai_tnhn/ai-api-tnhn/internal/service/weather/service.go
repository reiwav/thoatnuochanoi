package weather

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type RainDataResponse struct {
	Code    int `json:"Code"`
	Content struct {
		Tram []struct {
			Id        interface{} `json:"Id"` // Can be float64 or string from external API
			TenTram   string      `json:"TenTram"`
			TenPhuong string      `json:"TenPhuong"`
		} `json:"tram"`
		Data []struct {
			TramId      interface{} `json:"TramId"` // Can be float64 or string
			LuongMua_BD float64     `json:"LuongMua_BD"`
			ThoiGian_BD string      `json:"ThoiGian_BD"`
			LuongMua_HT float64     `json:"LuongMua_HT"`
			ThoiGian_HT string      `json:"ThoiGian_HT"`
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
		} `json:"tram"`
		Data []struct {
			TramId       string  `json:"TramId"`
			ThuongLuu_HT float64 `json:"ThuongLuu_HT"`
			ThoiGian_HT  string  `json:"ThoiGian_HT"`
			Loai         int     `json:"Loai"`
		} `json:"data"`
	} `json:"Content"`
}

type Service interface {
	GetRawRainData(ctx context.Context) (*RainDataResponse, error)
	GetRawWaterData(ctx context.Context) (*WaterDataResponse, error)
}

type service struct{}

func NewService() Service {
	return &service{}
}

func (s *service) GetRawRainData(ctx context.Context) (*RainDataResponse, error) {
	url := "https://noibo.thoatnuochanoi.vn/api/thuytri/getallrain?id=3a1a672f-c56f-4752-b86c-455e30427b87"
	resp, err := http.Get(url)
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

	return &rainData, nil
}

func (s *service) GetRawWaterData(ctx context.Context) (*WaterDataResponse, error) {
	url := "https://noibo.thoatnuochanoi.vn/api/thuytri/getallmucnuoc?id=3a1a672f-c56f-4752-b86c-455e30427b87"
	resp, err := http.Get(url)
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
