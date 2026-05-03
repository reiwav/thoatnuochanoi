package pumpingstation

type PumpingStationStat struct {
	Name             string `json:"name"`
	Priority         int    `json:"priority"`
	OrgName          string `json:"org_name"`
	PumpCount        int    `json:"pump_count"`
	OperatingCount   int    `json:"operating_count"`
	ClosedCount      int    `json:"closed_count"`
	MaintenanceCount int    `json:"maintenance_count"`
	Note             string `json:"note"`
	LastUpdate       string `json:"last_update"`
}

type PumpingStationSummaryData struct {
	TotalStations       int                  `json:"total_stations"`
	TotalPumps          int                  `json:"total_pumps"`
	TotalOperatingPumps int                  `json:"total_operating_pumps"`
	Stations            []PumpingStationStat `json:"stations"`
	SummaryText         string               `json:"summary_text"` // Combined summary of operating stations
	SummaryPriorityText string               `json:"summary_priority_text"`
}
