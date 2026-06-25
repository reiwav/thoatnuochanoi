package sluice_gate

type SluiceGateStat struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Priority    int    `json:"priority"`
	OrgName     string `json:"org_name"`
	Quantity    int    `json:"quantity"` // total doors
	OpenCount   int    `json:"open_count"`
	ClosedCount int    `json:"closed_count"`
	Note        string `json:"note"`
	LastUpdate  string `json:"last_update"`
}

type SluiceGateSummaryData struct {
	TotalGates          int              `json:"total_gates"`
	TotalOpenGates      int              `json:"total_open_gates"`
	TotalDoors          int              `json:"total_doors"`
	TotalOpenDoors      int              `json:"total_open_doors"`
	Gates               []SluiceGateStat `json:"gates"`
	SummaryText         string           `json:"summary_text"`
	SummaryPriorityText string           `json:"summary_priority_text"`
}
