package rain

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/integration/thoatnuoc"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/station"
	"context"
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

func NewWorker(l logger.Logger, rain repository.Rain, stationSvc station.Service, thoatnuocSvc thoatnuoc.Service) Worker {
	return &worker{
		logger:       l,
		rainRepo:     rain,
		stationSvc:   stationSvc,
		thoatnuocSvc: thoatnuocSvc,
		sessionID:    "5xazplb5mwlmi4hr0hyqy0th", // Hardcoded session ID
	}
}

func (w *worker) Start(ctx context.Context) {
	w.logger.GetLogger().Info(">>> Rain Station Data Worker is STARTING...")
	go w.run(ctx)
}

func (w *worker) run(ctx context.Context) {
	ticker := time.NewTicker(15 * time.Minute)
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
	for d := startDate; !d.After(now); d = d.AddDate(0, 0, 1) {
		w.fetchAndSave(ctx, s, d, latest)
	}
}

func (w *worker) fetchAndSave(ctx context.Context, s *models.RainStation, date time.Time, latest *models.RainRecord) {
	dateStr := date.Format("2006-01-02")
	dataPoints, err := w.thoatnuocSvc.GetRainChartData(ctx, w.sessionID, s.OldID, dateStr)
	if err != nil {
		w.logger.GetLogger().Errorf("RainWorker: Failed to fetch data for station %s on %s: %v", s.TenTram, dateStr, err)
		return
	}

	inserted := 0
	for _, dp := range dataPoints {
		ts, err := time.ParseInLocation("2006-01-02T15:04:05", dp.ThoiGian, time.Local)
		if err != nil {
			continue
		}

		// Skip if already in DB (check against latest timestamp)
		if latest != nil && !ts.After(latest.Timestamp) {
			continue
		}

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

	if inserted > 0 {
		w.logger.GetLogger().Infof("RainWorker: Successfully synced %d new records for station %s on %s", inserted, s.TenTram, dateStr)
	}
}
