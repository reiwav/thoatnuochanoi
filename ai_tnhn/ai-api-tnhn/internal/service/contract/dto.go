package contract

import "ai-api-tnhn/internal/service/google/googledrive"

type ContractQueryResult struct {
	ID              string                 `json:"id"`
	Name            string                 `json:"name"`
	CategoryName    string                 `json:"category_name"`
	StartDate       string                 `json:"start_date"`
	EndDate         string                 `json:"end_date"`
	DaysRemaining   int                    `json:"days_remaining"` // negative = overdue
	DriveFolderLink string                 `json:"drive_folder_link"`
	TotalValue      float64                `json:"total_value"`
	Files           []googledrive.FileInfo `json:"files"`
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
