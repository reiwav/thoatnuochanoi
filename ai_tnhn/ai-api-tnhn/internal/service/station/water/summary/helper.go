package summary

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/setting"
	"ai-api-tnhn/internal/service/station/water/dto"
	"context"
	"fmt"
	"strings"
	"time"
)

// buildStationStat converts station metadata and its latest record into a WaterStationStat struct
func buildStationStat(
	ctx context.Context,
	now time.Time,
	label string,
	name string,
	priority int,
	address string,
	thresholdConfigs []models.StationThresholdConfig,
	rec *dto.WaterRecordInfo,
	thresholdSvc setting.WaterThresholdService,
) dto.WaterStationStat {
	if rec == nil {
		return dto.WaterStationStat{
			Name:            name,
			Level:           0,
			Label:           label,
			ThoiGian:        "-",
			Priority:        priority,
			Address:         address,
			ThresholdStatus: "no_data",
			StatusText:      "Chưa có dữ liệu",
			IsExceeded:      false,
			HasData:         false,
		}
	}

	valInMeters := rec.Value
	timeStr := rec.Timestamp.Format("15:04")
	status := ""
	minVal := rec.MinThreshold
	maxVal := rec.MaxThreshold
	var statusText string
	var isExceeded bool

	if thresholdSvc != nil && len(thresholdConfigs) > 0 {
		status, minVal, maxVal = thresholdSvc.CalculateThresholdStatus(ctx, now, thresholdConfigs, valInMeters)
	} else {
		status = rec.ThresholdStatus
	}

	if status == "high" {
		statusText = "Vượt ngưỡng cao"
		isExceeded = true
	} else if status == "low" {
		statusText = "Dưới ngưỡng thấp"
		isExceeded = true
	} else {
		statusText = "Bình thường"
		status = "normal"
	}

	return dto.WaterStationStat{
		Name:            name,
		Level:           valInMeters,
		Label:           label,
		ThoiGian:        timeStr,
		Priority:        priority,
		Address:         address,
		ThresholdStatus: status,
		StatusText:      statusText,
		IsExceeded:      isExceeded,
		HasData:         true,
		MinThreshold:    minVal,
		MaxThreshold:    maxVal,
	}
}

// formatCategorySummary generates human-readable text summary for a list of station stats
func formatCategorySummary(stations []dto.WaterStationStat, categoryTitle string, emptyMessage string) (summaryStr string, sectionText string) {
	if len(stations) == 0 {
		return emptyMessage, ""
	}

	var lines []string
	for _, st := range stations {
		if !st.HasData {
			lines = append(lines, fmt.Sprintf("- %s: Chưa có dữ liệu", st.Name))
			continue
		}
		line := fmt.Sprintf("- %s: %.2f", st.Name, st.Level)
		if st.IsExceeded {
			line += fmt.Sprintf(" (%s", st.StatusText)
			if st.ThresholdStatus == "high" && st.MaxThreshold > 0 {
				line += fmt.Sprintf(": %.2f > Ngưỡng cao %.2f", st.Level, st.MaxThreshold)
			} else if st.ThresholdStatus == "low" && st.MinThreshold > 0 {
				line += fmt.Sprintf(": %.2f < Ngưỡng thấp %.2f", st.Level, st.MinThreshold)
			}
			line += ")"
		}
		lines = append(lines, line)
	}

	summaryStr = strings.Join(lines, "\n")
	sectionText = categoryTitle + ":\n" + summaryStr
	return summaryStr, sectionText
}
