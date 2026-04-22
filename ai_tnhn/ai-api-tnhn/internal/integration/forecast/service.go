package forecast

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type ForecastResponse struct {
	Daily struct {
		Time                        []string  `json:"time"`
		Weathercode                 []int     `json:"weathercode"`
		Temperature2mMax            []float64 `json:"temperature_2m_max"`
		Temperature2mMin            []float64 `json:"temperature_2m_min"`
		PrecipitationSum            []float64 `json:"precipitation_sum"`
		PrecipitationProbabilityMax []int     `json:"precipitation_probability_max"`
	} `json:"daily"`
}

type Service interface {
	GetHanoiForecast(ctx context.Context) (*ForecastResponse, error)
}

type service struct{}

func NewService() Service {
	return &service{}
}

func (s *service) GetHanoiForecast(ctx context.Context) (*ForecastResponse, error) {
	// Fetch real weather data from Open-Meteo (Hanoi: 21.0285, 105.8542)
	meteoURL := "https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.8542&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto"
	client := &http.Client{Timeout: 10 * time.Second}
	respMeteo, err := client.Get(meteoURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch open-meteo forecast: %w", err)
	}
	defer respMeteo.Body.Close()

	body, err := io.ReadAll(respMeteo.Body)
	if err != nil {
		return nil, err
	}

	var data ForecastResponse
	if err := json.Unmarshal(body, &data); err != nil {
		return nil, fmt.Errorf("failed to unmarshal forecast data: %w", err)
	}

	return &data, nil
}
