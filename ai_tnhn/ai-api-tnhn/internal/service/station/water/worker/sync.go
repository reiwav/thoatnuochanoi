package worker

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/utils"
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"
)

// Sync executes a single pass of water data synchronization from the external ThoatNuocHaNoi API
func (w *worker) Sync(ctx context.Context) error {
	// 1. Fetch all active River & Lake stations from system database
	riverStations, err := w.stationSvc.GetAllRiverStations(ctx)
	if err != nil {
		w.logger.GetLogger().Errorf("[WaterWorker] Failed to load river stations: %v", err)
	}

	lakeStations, err := w.stationSvc.GetAllLakeStations(ctx)
	if err != nil {
		w.logger.GetLogger().Errorf("[WaterWorker] Failed to load lake stations: %v", err)
	}

	// 2. Build lookup maps for AUTO stations by OldID
	riverAutoMap := buildAutoRiverMap(riverStations)
	lakeAutoMap := buildAutoLakeMap(lakeStations)

	// If no auto stations exist in DB, skip execution
	if len(riverAutoMap) == 0 && len(lakeAutoMap) == 0 {
		return nil
	}

	// 3. Call external API GetRawWaterData from thoatnuochanoi
	raw, err := w.thoatnuocSvc.GetRawWaterData(ctx)
	if err != nil {
		return fmt.Errorf("failed to fetch raw water data from external API: %w", err)
	}
	if raw == nil || len(raw.Content.Data) == 0 {
		return nil
	}

	systemUser := &models.User{
		Role: "super_admin",
	}

	riverInserted := 0
	lakeInserted := 0

	// 4. Process each raw data item
	for _, item := range raw.Content.Data {
		tramIDStr := strings.TrimSpace(item.TramId)
		if tramIDStr == "" || item.ThuongLuu_HT <= 0 {
			continue
		}

		stationID, err := strconv.ParseInt(tramIDStr, 10, 64)
		if err != nil || stationID <= 0 {
			continue
		}

		itemTime := utils.ParseFlexibleTime(item.ThoiGian_HT)
		dateStr := utils.FormatDate(itemTime)

		// Case A: River Station
		if targetRiverSt, exists := riverAutoMap[stationID]; exists && targetRiverSt != nil {
			if w.syncRiverItem(ctx, stationID, targetRiverSt, item.ThuongLuu_HT, itemTime, dateStr, systemUser) {
				riverInserted++
			}
		}

		// Case B: Lake Station
		if targetLakeSt, exists := lakeAutoMap[stationID]; exists && targetLakeSt != nil {
			if w.syncLakeItem(ctx, stationID, targetLakeSt, item.ThuongLuu_HT, itemTime, dateStr, systemUser) {
				lakeInserted++
			}
		}
	}

	if riverInserted > 0 || lakeInserted > 0 {
		w.logger.GetLogger().Infof("[WaterWorker] Auto synced: %d river records, %d lake records", riverInserted, lakeInserted)
	}

	return nil
}

// buildAutoRiverMap filters active auto River stations and maps them by OldID
func buildAutoRiverMap(stations []*models.RiverStation) map[int64]*models.RiverStation {
	autoMap := make(map[int64]*models.RiverStation)
	for _, st := range stations {
		if st != nil && st.Active && (st.IsAuto || st.DataMode == "auto") {
			oldID := int64(st.OldID)
			if oldID > 0 {
				autoMap[oldID] = st
			}
		}
	}
	return autoMap
}

// buildAutoLakeMap filters active auto Lake stations and maps them by OldID
func buildAutoLakeMap(stations []*models.LakeStation) map[int64]*models.LakeStation {
	autoMap := make(map[int64]*models.LakeStation)
	for _, st := range stations {
		if st != nil && st.Active && (st.IsAuto || st.DataMode == "auto") {
			oldID := int64(st.OldID)
			if oldID > 0 {
				autoMap[oldID] = st
			}
		}
	}
	return autoMap
}

// syncRiverItem creates a river record if it doesn't already exist
func (w *worker) syncRiverItem(
	ctx context.Context,
	stationID int64,
	target *models.RiverStation,
	value float64,
	itemTime time.Time,
	dateStr string,
	user *models.User,
) bool {
	exists, _ := w.riverRepo.Exists(ctx, stationID, itemTime)
	if exists {
		return false
	}

	record := &models.RiverRecord{
		StationID:   stationID,
		StationName: target.TenTram,
		Value:       value,
		Timestamp:   itemTime,
		Date:        dateStr,
		Source:      "auto",
	}

	return w.recordsSvc.CreateRiverRecord(ctx, record, user) == nil
}

// syncLakeItem creates a lake record if it doesn't already exist
func (w *worker) syncLakeItem(
	ctx context.Context,
	stationID int64,
	target *models.LakeStation,
	value float64,
	itemTime time.Time,
	dateStr string,
	user *models.User,
) bool {
	exists, _ := w.lakeRepo.Exists(ctx, stationID, itemTime)
	if exists {
		return false
	}

	record := &models.LakeRecord{
		StationID:   stationID,
		StationName: target.TenTram,
		Value:       value,
		Timestamp:   itemTime,
		Date:        dateStr,
		Source:      "auto",
	}

	return w.recordsSvc.CreateLakeRecord(ctx, record, user) == nil
}
