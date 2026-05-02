package rain

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/integration/thoatnuoc"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/station"
	"context"
	"fmt"
	"time"
)

type Worker interface {
	Start(ctx context.Context)
}

type worker struct {
	logger       logger.Logger
	rainRepo     repository.Rain
	stationSvc   station.Service
	thoatnuocSvc thoatnuoc.Service
	sessionID    string
}

// ASP.NET_SessionId=kzela2aw0gdvzxvrthicl14n
func NewWorker(l logger.Logger, rain repository.Rain, stationSvc station.Service, thoatnuocSvc thoatnuoc.Service) Worker {
	return &worker{
		logger:       l,
		rainRepo:     rain,
		stationSvc:   stationSvc,
		thoatnuocSvc: thoatnuocSvc,
		sessionID:    "kzela2aw0gdvzxvrthicl14n", // Hardcoded session ID
	}
}

func (w *worker) Start(ctx context.Context) {
	w.logger.GetLogger().Info(">>> Rain Station Data Worker is STARTING...")
	go w.run(ctx)
}

func (w *worker) run(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	// Initial sync
	w.sync(ctx)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.sync(ctx)
		}
	}
}

func (w *worker) sync(ctx context.Context) {
	stations, err := w.stationSvc.GetAllRainStations(ctx)
	if err != nil {
		w.logger.GetLogger().Errorf("RainWorker: Failed to list rain stations: %v", err)
		return
	}

	for _, s := range stations {
		if !s.Active {
			continue
		}
		w.syncStation(ctx, s)
		time.Sleep(time.Millisecond * 200)
	}
}

func (w *worker) syncStation(ctx context.Context, s *models.RainStation) {
	latest, err := w.rainRepo.GetLatest(ctx, int64(s.OldID))
	var startDate time.Time
	if err == nil && latest != nil {
		startDate = latest.Timestamp
	} else {
		// Default to today if no records found
		startDate = time.Now().AddDate(0, 0, -1) // Start from yesterday to be safe
	}

	// Iterate from startDate to today
	now := time.Now()
	totalInserted := 0
	for d := startDate; !d.After(now); d = d.AddDate(0, 0, 1) {
		totalInserted += w.fetchAndSave(ctx, s, d, latest)
	}

	// If no data found up to now, save a marker for the previous day to avoid re-scanning
	if totalInserted == 0 {
		markerTime := now.AddDate(0, 0, -1)
		// Only save if this marker is actually newer than what we have
		if latest == nil || markerTime.After(latest.Timestamp) {
			record := &models.RainRecord{
				StationID:   int64(s.OldID),
				StationName: s.TenTram,
				Date:        markerTime.Format("2006-01-02"),
				Timestamp:   markerTime,
				Value:       0,
			}
			_ = w.rainRepo.Create(ctx, record)
			w.logger.GetLogger().Infof("RainWorker: Saved marker (0) for station %s at %v to avoid re-scan", s.TenTram, markerTime)
		}
	}
}

func (w *worker) fetchAndSave(ctx context.Context, s *models.RainStation, date time.Time, latest *models.RainRecord) int {
	dateStr := date.Format("2006-01-02")
	w.logger.GetLogger().Infof("RainWorker: [DEBUG] Fetching data for station %s (%d) on %s", s.TenTram, s.OldID, dateStr)

	dataPoints, err := w.thoatnuocSvc.GetRainChartData(ctx, w.sessionID, s.OldID, dateStr)
	fmt.Println("====== dataPoints: ", len(dataPoints))
	if err != nil {
		w.logger.GetLogger().Errorf("RainWorker: Failed to fetch data for station %s on %s: %v", s.TenTram, dateStr, err)
		return 0
	}

	if len(dataPoints) == 0 {
		w.logger.GetLogger().Infof("RainWorker: [DEBUG] No data points returned for station %s on %s", s.TenTram, dateStr)
		return 0
	}

	w.logger.GetLogger().Infof("RainWorker: [DEBUG] Received %d points for station %s on %s", len(dataPoints), s.TenTram, dateStr)

	inserted := 0
	skipped := 0
	for _, dp := range dataPoints {
		ts, err := time.ParseInLocation("2006-01-02T15:04:05", dp.ThoiGian, time.Local)
		if err != nil {
			w.logger.GetLogger().Errorf("RainWorker: [DEBUG] Failed to parse timestamp %s: %v", dp.ThoiGian, err)
			continue
		}

		// Skip if already in DB (check against latest timestamp)
		if latest != nil && !ts.In(time.UTC).After(latest.Timestamp.In(time.UTC)) {
			skipped++
			continue
		}

		// Extra check to ensure same timestamp is not saved
		// exists, err := w.rainRepo.Exists(ctx, int64(s.OldID), ts)
		// if err == nil && exists {
		// 	skipped++
		// 	continue
		// }

		record := &models.RainRecord{
			StationID:   int64(s.OldID),
			StationName: s.TenTram,
			Date:        ts.Format("2006-01-02"),
			Timestamp:   ts,
			Value:       dp.LuongMua,
		}

		err = w.rainRepo.Create(ctx, record)
		if err != nil {
			w.logger.GetLogger().Errorf("RainWorker: Failed to save record for %s at %v: %v", s.TenTram, ts, err)
			continue
		}
		inserted++
	}

	w.logger.GetLogger().Infof("RainWorker: Finished station %s on %s. Inserted: %d, Skipped: %d", s.TenTram, dateStr, inserted, skipped)
	return inserted
}
