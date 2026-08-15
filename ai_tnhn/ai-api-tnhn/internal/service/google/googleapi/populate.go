package googleapi

// Attaches the structured tables to an AI report response. Each populate*
// method guards against a missing section, orders the data if the table has an
// ordering rule, and delegates row construction to the constructors in
// tables.go. An absent or empty section leaves Tables untouched so the frontend
// can distinguish "no data" from "empty table".

import (
	"sort"
	"strings"
)

func (s *service) populateRainTable(res *ChatResponse, status *CityStatus) {
	if status.Weather == nil || len(status.Weather.Measurements) == 0 {
		return
	}

	// Order: inner-city wards first, then by report weight, then by rainfall.
	//
	// Note the ward test compares against the diacritic forms "phường"/"xã"
	// while live data carries "phuong"/"xa", so in practice the first key rarely
	// fires and ordering falls through to priority and rainfall. Preserved
	// as-is; changing it would reshuffle every rain report.
	indices := make([]int, len(status.Weather.Measurements))
	for i := range indices {
		indices[i] = i
	}
	sort.SliceStable(indices, func(i, j int) bool {
		mI := status.Weather.Measurements[indices[i]]
		mJ := status.Weather.Measurements[indices[j]]
		isPhuongXaI := strings.Contains(strings.ToLower(mI.Type), "phường") || strings.Contains(strings.ToLower(mI.Type), "xã")
		isPhuongXaJ := strings.Contains(strings.ToLower(mJ.Type), "phường") || strings.Contains(strings.ToLower(mJ.Type), "xã")
		if isPhuongXaI != isPhuongXaJ {
			return isPhuongXaJ
		}
		if mI.Priority != mJ.Priority {
			return mI.Priority > mJ.Priority
		}
		return mI.TotalRain > mJ.TotalRain
	})

	var rains []RainTableRow
	for i, idx := range indices {
		m := status.Weather.Measurements[idx]
		rains = append(rains, NewRainTableRow(i+1, m.ID, m.OldID, m.Name, m.Address, m.Type, m.Priority, m.TotalRain, m.IsRaining, m.StartTime, m.EndTime, ""))
	}
	res.Tables["rains"] = rains
}

func (s *service) populateWaterTable(res *ChatResponse, status *CityStatus) {
	if status.Water == nil {
		return
	}
	if len(status.Water.LakeStations) > 0 {
		res.Tables["lakes"] = NewWaterTableRows(status.Water.LakeStations)
	}
	if len(status.Water.RiverStations) > 0 {
		res.Tables["rivers"] = NewWaterTableRows(status.Water.RiverStations)
	}
}

func (s *service) populateInundationTable(res *ChatResponse, status *CityStatus) {
	if status.Inundation == nil || len(status.Inundation.OngoingPoints) == 0 {
		return
	}
	res.Tables["inundations"] = NewInundationTableRows(status.Inundation.OngoingPoints)
}

func (s *service) populatePumpingTable(res *ChatResponse, status *CityStatus) {
	if status.Pumping == nil || len(status.Pumping.Stations) == 0 {
		return
	}
	res.Tables["pumping_stations"] = NewPumpTableRows(status.Pumping)
}

func (s *service) populateWastewaterTable(res *ChatResponse, status *CityStatus) {
	if len(status.Wastewater) == 0 {
		return
	}
	res.Tables["wastewater"] = NewWastewaterTableRows(status.Wastewater)
}
