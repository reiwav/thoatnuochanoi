package water

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/integration/thoatnuoc"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/station"
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/robfig/cron/v3"
)

type WaterWorker interface {
	Start(ctx context.Context)
	Sync(ctx context.Context) error
}

type waterWorker struct {
	logger       logger.Logger
	riverRepo    repository.River
	lakeRepo     repository.Lake
	waterSvc     Service
	stationSvc   station.Service
	thoatnuocSvc thoatnuoc.Service
}

func NewWaterWorker(
	l logger.Logger,
	riverRepo repository.River,
	lakeRepo repository.Lake,
	waterSvc Service,
	stationSvc station.Service,
	thoatnuocSvc thoatnuoc.Service,
) WaterWorker {
	return &waterWorker{
		logger:       l,
		riverRepo:    riverRepo,
		lakeRepo:     lakeRepo,
		waterSvc:     waterSvc,
		stationSvc:   stationSvc,
		thoatnuocSvc: thoatnuocSvc,
	}
}

func (w *waterWorker) Start(ctx context.Context) {
	w.logger.GetLogger().Info(">>> Water Station (River/Lake Auto) Cron Worker is STARTING...")

	// Initial sync on startup
	go func() {
		if err := w.Sync(ctx); err != nil {
			w.logger.GetLogger().Errorf("[WaterWorker] Initial sync error: %v", err)
		}
	}()

	loc, err := time.LoadLocation("Asia/Ho_Chi_Minh")
	if err != nil {
		loc = time.FixedZone("GMT+7", 7*60*60)
	}

	c := cron.New(cron.WithLocation(loc))
	// Run cronjob every 5 minutes: "*/5 * * * *"
	_, err = c.AddFunc("*/5 * * * *", func() {
		if err := w.Sync(ctx); err != nil {
			w.logger.GetLogger().Errorf("[WaterWorker] 5-min sync error: %v", err)
		}
	})
	if err != nil {
		w.logger.GetLogger().Errorf("[WaterWorker] Failed to schedule cron: %v", err)
	}
	c.Start()

	go func() {
		<-ctx.Done()
		c.Stop()
	}()
}

func (w *waterWorker) Sync(ctx context.Context) error {
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
	// Station must be Active and (IsAuto == true OR DataMode == "auto")
	riverAutoMap := make(map[int64]*models.RiverStation)
	for _, st := range riverStations {
		if st != nil && st.Active && (st.IsAuto || st.DataMode == "auto") {
			oldID := int64(st.OldID)
			if oldID > 0 {
				riverAutoMap[oldID] = st
			}
		}
	}

	lakeAutoMap := make(map[int64]*models.LakeStation)
	for _, st := range lakeStations {
		if st != nil && st.Active && (st.IsAuto || st.DataMode == "auto") {
			oldID := int64(st.OldID)
			if oldID > 0 {
				lakeAutoMap[oldID] = st
			}
		}
	}

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

	// Map external station type metadata (Loai "1" -> River, "2" -> Lake)
	stationTypeMap := make(map[string]string)
	for _, t := range raw.Content.Tram {
		stationTypeMap[t.Id] = t.Loai
	}

	systemUser := &models.User{
		Role: "super_admin",
	}

	loc, _ := time.LoadLocation("Asia/Ho_Chi_Minh")
	riverInserted := 0
	lakeInserted := 0

	for _, item := range raw.Content.Data {
		tramIDStr := strings.TrimSpace(item.TramId)
		if tramIDStr == "" || item.ThuongLuu_HT <= 0 {
			continue
		}

		stationID, err := strconv.ParseInt(tramIDStr, 10, 64)
		if err != nil || stationID <= 0 {
			continue
		}

		// Determine station category (1 -> River, 2 -> Lake)
		loai := stationTypeMap[tramIDStr]
		if loai == "" {
			if item.Loai == 1 {
				loai = "1"
			} else if item.Loai == 2 {
				loai = "2"
			}
		}

		// Parse timestamp string from external API
		tsStr := strings.TrimSpace(item.ThoiGian_HT)
		var itemTime time.Time
		if tsStr != "" {
			if t, err := time.ParseInLocation("02/01/2006 15:04:05", tsStr, loc); err == nil {
				itemTime = t
			} else if t, err := time.ParseInLocation("02/01/2006 15:04", tsStr, loc); err == nil {
				itemTime = t
			} else if t, err := time.ParseInLocation("2006-01-02 15:04:05", tsStr, loc); err == nil {
				itemTime = t
			} else if t, err := time.ParseInLocation("2006-01-02T15:04:05", tsStr, loc); err == nil {
				itemTime = t
			} else if t, err := time.Parse(time.RFC3339, tsStr); err == nil {
				itemTime = t
			}
		}

		if itemTime.IsZero() {
			itemTime = time.Now().In(loc)
		}

		dateStr := itemTime.In(loc).Format("2006-01-02")

		// Case A: River Station (must be an active Auto River station in system DB)
		if targetRiverSt, existsInMap := riverAutoMap[stationID]; existsInMap && targetRiverSt != nil {
			exists, _ := w.riverRepo.Exists(ctx, stationID, itemTime)
			if !exists {
				record := &models.RiverRecord{
					StationID:   stationID,
					StationName: targetRiverSt.TenTram,
					Value:       item.ThuongLuu_HT,
					Timestamp:   itemTime,
					Date:        dateStr,
					Source:      "auto",
				}
				if err := w.waterSvc.CreateRiverRecord(ctx, record, systemUser); err == nil {
					riverInserted++
				}
			}
		}

		// Case B: Lake Station (must be an active Auto Lake station in system DB)
		if targetLakeSt, existsInMap := lakeAutoMap[stationID]; existsInMap && targetLakeSt != nil {
			exists, _ := w.lakeRepo.Exists(ctx, stationID, itemTime)
			if !exists {
				record := &models.LakeRecord{
					StationID:   stationID,
					StationName: targetLakeSt.TenTram,
					Value:       item.ThuongLuu_HT,
					Timestamp:   itemTime,
					Date:        dateStr,
					Source:      "auto",
				}
				if err := w.waterSvc.CreateLakeRecord(ctx, record, systemUser); err == nil {
					lakeInserted++
				}
			}
		}
	}

	if riverInserted > 0 || lakeInserted > 0 {
		w.logger.GetLogger().Infof("[WaterWorker] Auto synced: %d river records, %d lake records", riverInserted, lakeInserted)
	}

	return nil
}
