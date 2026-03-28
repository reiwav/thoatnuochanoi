package contract

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"context"
	"math"
	"strings"
	"time"
)

// --- Query result types ---

type ContractQueryResult struct {
	ID              string  `json:"id"`
	Name            string  `json:"name"`
	CategoryName    string  `json:"category_name"`
	StartDate       string  `json:"start_date"`
	EndDate         string  `json:"end_date"`
	DaysRemaining   int     `json:"days_remaining"` // negative = overdue
	DriveFolderLink string  `json:"drive_folder_link"`
	TotalValue      float64 `json:"total_value"`
}

type StageQueryResult struct {
	ContractID      string  `json:"contract_id"`
	ContractName    string  `json:"contract_name"`
	StageName       string  `json:"stage_name"`
	Amount          float64 `json:"amount"`
	Date            string  `json:"date"`
	DaysRemaining   int     `json:"days_remaining"`
	DriveFolderLink string  `json:"drive_folder_link"`
}

type ContractSummaryStats struct {
	Total          int     `json:"total"`
	Active         int     `json:"active"`
	Expired        int     `json:"expired"`
	ExpiringSoon30 int     `json:"expiring_soon_30d"`
	TotalValue     float64 `json:"total_value"`
}

// --- Helper ---

var dateFormats = []string{
	time.RFC3339,
	"2006-01-02T15:04:05Z07:00",
	"2006-01-02T15:04:05Z",
	"2006-01-02T15:04:05",
	"2006-01-02",
}

func parseDate(s string) (time.Time, bool) {
	for _, layout := range dateFormats {
		if t, err := time.Parse(layout, s); err == nil {
			return t, true
		}
	}
	return time.Time{}, false
}

func daysUntil(target time.Time) int {
	now := time.Now().Truncate(24 * time.Hour)
	target = target.Truncate(24 * time.Hour)
	return int(math.Round(target.Sub(now).Hours() / 24))
}

func (s *service) getAllContracts(ctx context.Context) ([]*ContractQueryResult, error) {
	contracts, _, err := s.repo.List(ctx, filter.NewBasicFilter())
	if err != nil {
		return nil, err
	}

	// Build category name cache
	catNames := make(map[string]string)
	for _, c := range contracts {
		if c.CategoryID != "" {
			if _, ok := catNames[c.CategoryID]; !ok {
				cat, err := s.catRepo.GetByID(ctx, c.CategoryID)
				if err == nil && cat != nil {
					catNames[c.CategoryID] = cat.Name
				}
			}
		}
	}

	var results []*ContractQueryResult
	for _, c := range contracts {
		// Repair ID if it's a path
		if strings.Contains(c.DriveFolderID, "/") {
			_ = s.ensureDriveFolder(ctx, c, c.OrgID)
			_ = s.repo.Upsert(ctx, c)
		}

		totalValue := 0.0
		for _, stage := range c.Stages {
			totalValue += stage.Amount
		}

		daysRem := 0
		if endDate, ok := parseDate(c.EndDate); ok {
			daysRem = daysUntil(endDate)
		}

		results = append(results, &ContractQueryResult{
			ID:              c.ID,
			Name:            c.Name,
			CategoryName:    catNames[c.CategoryID],
			StartDate:       c.StartDate,
			EndDate:         c.EndDate,
			DaysRemaining:   daysRem,
			DriveFolderLink: c.DriveFolderLink,
			TotalValue:      totalValue,
		})
	}
	return results, nil
}

// --- Query methods ---

func (s *service) GetContractSummary(ctx context.Context) (*ContractSummaryStats, error) {
	contracts, err := s.getAllContracts(ctx)
	if err != nil {
		return nil, err
	}

	stats := &ContractSummaryStats{Total: len(contracts)}
	for _, c := range contracts {
		stats.TotalValue += c.TotalValue
		if c.EndDate == "" {
			stats.Active++
			continue
		}
		if c.DaysRemaining < 0 {
			stats.Expired++
		} else {
			stats.Active++
			if c.DaysRemaining <= 30 {
				stats.ExpiringSoon30++
			}
		}
	}
	return stats, nil
}

func (s *service) GetExpiringSoon(ctx context.Context, days int) ([]*ContractQueryResult, error) {
	contracts, err := s.getAllContracts(ctx)
	if err != nil {
		return nil, err
	}

	var results []*ContractQueryResult
	for _, c := range contracts {
		if c.EndDate != "" && c.DaysRemaining >= 0 && c.DaysRemaining <= days {
			results = append(results, c)
		}
	}
	return results, nil
}

func (s *service) GetExpired(ctx context.Context) ([]*ContractQueryResult, error) {
	contracts, err := s.getAllContracts(ctx)
	if err != nil {
		return nil, err
	}

	var results []*ContractQueryResult
	for _, c := range contracts {
		if c.EndDate != "" && c.DaysRemaining < 0 {
			results = append(results, c)
		}
	}
	return results, nil
}

func (s *service) GetStagesDueSoon(ctx context.Context, days int) ([]*StageQueryResult, error) {
	contracts, _, err := s.repo.List(ctx, filter.NewBasicFilter())
	if err != nil {
		return nil, err
	}

	var results []*StageQueryResult
	for _, c := range contracts {
		for _, stage := range c.Stages {
			if stageDate, ok := parseDate(stage.Date); ok {
				daysRem := daysUntil(stageDate)
				if daysRem >= 0 && daysRem <= days {
					results = append(results, &StageQueryResult{
						ContractID:      c.ID,
						ContractName:    c.Name,
						StageName:       stage.Name,
						Amount:          stage.Amount,
						Date:            stage.Date,
						DaysRemaining:   daysRem,
						DriveFolderLink: c.DriveFolderLink,
					})
				}
			}
		}
	}
	return results, nil
}

func (s *service) GetStagesPassed(ctx context.Context) ([]*StageQueryResult, error) {
	contracts, _, err := s.repo.List(ctx, filter.NewBasicFilter())
	if err != nil {
		return nil, err
	}

	var results []*StageQueryResult
	for _, c := range contracts {
		for _, stage := range c.Stages {
			if stageDate, ok := parseDate(stage.Date); ok {
				daysRem := daysUntil(stageDate)
				if daysRem < 0 {
					results = append(results, &StageQueryResult{
						ContractID:      c.ID,
						ContractName:    c.Name,
						StageName:       stage.Name,
						Amount:          stage.Amount,
						Date:            stage.Date,
						DaysRemaining:   daysRem,
						DriveFolderLink: c.DriveFolderLink,
					})
				}
			}
		}
	}
	return results, nil
}

func (s *service) SearchContracts(ctx context.Context, keyword string) ([]*ContractQueryResult, error) {
	contracts, err := s.getAllContracts(ctx)
	if err != nil {
		return nil, err
	}

	lower := strings.ToLower(keyword)
	var results []*ContractQueryResult
	for _, c := range contracts {
		if strings.Contains(strings.ToLower(c.Name), lower) ||
			strings.Contains(strings.ToLower(c.CategoryName), lower) {
			results = append(results, c)
		}
	}
	return results, nil
}
