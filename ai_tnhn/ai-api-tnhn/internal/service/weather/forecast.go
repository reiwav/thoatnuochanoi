package weather

import (
	"ai-api-tnhn/internal/integration/forecast"
	"ai-api-tnhn/internal/utils"
	"context"
	"fmt"
	"time"
)

func (s *service) SetForecastFunc(fn ForecastFunc) {
	s.forecastFunc = fn
}

func (s *service) GetForecast(ctx context.Context) (string, error) {
	// Caching: Only fetch once per day unless app restarts
	now := time.Now().In(utils.VietnamTZ)
	if s.forecast != "" && s.lastFetch.In(utils.VietnamTZ).Year() == now.Year() &&
		s.lastFetch.In(utils.VietnamTZ).Month() == now.Month() &&
		s.lastFetch.In(utils.VietnamTZ).Day() == now.Day() {
		return s.forecast, nil
	}

	// Fetch real weather data from Open-Meteo
	data, err := s.forecastSvc.GetHanoiForecast(ctx)
	if err != nil || len(data.Daily.Time) == 0 {
		return "Dự báo thời tiết 3 ngày tới: Hiện không có dữ liệu thời tiết.", nil
	}

	result := s.generateManualForecast(data)
	s.forecast = result
	s.lastFetch = time.Now()
	return result, nil
}

func (s *service) generateManualForecast(data *forecast.ForecastResponse) string {
	if data == nil || len(data.Daily.Time) == 0 {
		return "Dự báo thời tiết 3 ngày tới: Hiện không có dữ liệu thời tiết."
	}

	getWeatherDesc := func(code int) string {
		switch {
		case code == 0:
			return "Trời quang"
		case code >= 1 && code <= 3:
			return "Nhiều mây"
		case code >= 45 && code <= 48:
			return "Có sương mù"
		case code >= 51 && code <= 67:
			return "Mưa nhỏ"
		case code >= 80 && code <= 82:
			return "Mưa rào"
		case code >= 95:
			return "Có dông sét"
		default:
			return "Có mưa"
		}
	}

	result := "Dự báo thời tiết 3 ngày tới: \n"
	count := 0
	for i := 0; i < len(data.Daily.Time) && count < 3; i++ {
		t, _ := time.Parse("2006-01-02", data.Daily.Time[i])
		dateStr := t.Format("02/01")
		rainProb := 0
		if i < len(data.Daily.PrecipitationProbabilityMax) {
			rainProb = data.Daily.PrecipitationProbabilityMax[i]
		}
		rainFall := 0.0
		if i < len(data.Daily.PrecipitationSum) {
			rainFall = data.Daily.PrecipitationSum[i]
		}

		dayInfo := fmt.Sprintf("- Ngày %s: %s; Tỉ lệ mưa: %d%% (%.1fmm); Nhiệt độ: %.0f-%.0f°C",
			dateStr,
			getWeatherDesc(data.Daily.Weathercode[i]),
			rainProb,
			rainFall,
			data.Daily.Temperature2mMin[i],
			data.Daily.Temperature2mMax[i],
		)
		result += dayInfo + "\n"
		count++
	}

	return result
}

func (s *service) GetGeminiForecast(ctx context.Context) ([]ForecastDay, error) {
	now := time.Now().In(utils.VietnamTZ)
	if len(s.geminiForecast) > 0 && s.lastGeminiFetch.In(utils.VietnamTZ).Year() == now.Year() &&
		s.lastGeminiFetch.In(utils.VietnamTZ).Month() == now.Month() &&
		s.lastGeminiFetch.In(utils.VietnamTZ).Day() == now.Day() {
		return s.geminiForecast, nil
	}

	// Fetch real weather data from Open-Meteo
	data, err := s.forecastSvc.GetHanoiForecast(ctx)
	if err != nil {
		return nil, nil
	}

	s.geminiForecast = s.generateManualForecastJSON(data)
	s.lastGeminiFetch = time.Now()
	return s.geminiForecast, nil
}

func (s *service) generateManualForecastJSON(data *forecast.ForecastResponse) []ForecastDay {
	if data == nil || len(data.Daily.Time) == 0 {
		return nil
	}

	getWeatherDesc := func(code int) string {
		switch {
		case code == 0:
			return "Trời quang"
		case code >= 1 && code <= 3:
			return "Nhiều mây"
		case code >= 45 && code <= 48:
			return "Có sương mù"
		case code >= 51 && code <= 67:
			return "Mưa nhỏ"
		case code >= 80 && code <= 82:
			return "Mưa rào"
		case code >= 95:
			return "Có dông sét"
		default:
			return "Có mưa"
		}
	}

	var result []ForecastDay
	for i := 0; i < len(data.Daily.Time) && i < 3; i++ {
		t, _ := time.Parse("2006-01-02", data.Daily.Time[i])
		rainProb := 0
		if i < len(data.Daily.PrecipitationProbabilityMax) {
			rainProb = data.Daily.PrecipitationProbabilityMax[i]
		}
		rainFall := 0.0
		if i < len(data.Daily.PrecipitationSum) {
			rainFall = data.Daily.PrecipitationSum[i]
		}

		result = append(result, ForecastDay{
			Date:            t.Format("02/01"),
			Description:     getWeatherDesc(data.Daily.Weathercode[i]),
			TemperatureMin:  data.Daily.Temperature2mMin[i],
			TemperatureMax:  data.Daily.Temperature2mMax[i],
			RainProbability: rainProb,
			RainFall:        rainFall,
		})
	}

	return result
}
