package weather

import (
	"ai-api-tnhn/internal/repository"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
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

type HistoricalRainData map[string]map[string]float64

type Service interface {
	GetRawRainData(ctx context.Context) (*RainDataResponse, error)
	GetRawWaterData(ctx context.Context) (*WaterDataResponse, error)
	GetHistoricalRainData(ctx context.Context) (HistoricalRainData, error)
	GetComparisonData(ctx context.Context, year1, year2 int) (interface{}, error)
}

type service struct {
	histRepo repository.HistoricalRain
}

func NewService(histRepo repository.HistoricalRain) Service {
	return &service{histRepo: histRepo}
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

func (s *service) GetHistoricalRainData(ctx context.Context) (HistoricalRainData, error) {
	records, err := s.histRepo.FindAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch historical rain data from DB: %w", err)
	}

	results := make(HistoricalRainData)
	for _, r := range records {
		if _, ok := results[r.Station]; !ok {
			results[r.Station] = make(map[string]float64)
		}
		results[r.Station][r.Date] = r.Rainfall
	}

	return results, nil
}

func (s *service) GetComparisonData(ctx context.Context, year1, year2 int) (interface{}, error) {
	totals, err := s.histRepo.GetMonthlyTotals(ctx, []int{year1, year2})
	if err != nil {
		return nil, err
	}

	// Structure: map[year]map[month]map[station]total
	data := make(map[int]map[int]map[string]float64)
	data[year1] = make(map[int]map[string]float64)
	data[year2] = make(map[int]map[string]float64)

	stations := make(map[string]bool)

	for _, t := range totals {
		stations[t.Station] = true
		if _, ok := data[t.Year][t.Month]; !ok {
			data[t.Year][t.Month] = make(map[string]float64)
		}
		data[t.Year][t.Month][t.Station] = t.Total
	}

	// Also calculate annual totals
	annualTotals := make(map[int]map[string]float64)
	annualTotals[year1] = make(map[string]float64)
	annualTotals[year2] = make(map[string]float64)

	for y, months := range data {
		for _, stMap := range months {
			for st, val := range stMap {
				annualTotals[y][st] += val
			}
		}
	}

	stationList := []string{}
	for s := range stations {
		stationList = append(stationList, s)
	}

	return gin.H{
		"year1":        year1,
		"year2":        year2,
		"data":         data,
		"annualTotals": annualTotals,
		"stations":     stationList,
	}, nil
}
