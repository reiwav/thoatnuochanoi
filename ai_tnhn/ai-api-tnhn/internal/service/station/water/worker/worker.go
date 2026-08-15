package worker

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/integration/thoatnuoc"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/station"
	"ai-api-tnhn/internal/service/station/water/records"
	"ai-api-tnhn/utils"
	"context"

	"github.com/robfig/cron/v3"
)

// Worker defines the background worker interface for syncing automatic river and lake stations
type Worker interface {
	Start(ctx context.Context)
	Sync(ctx context.Context) error
}

type worker struct {
	logger       logger.Logger
	riverRepo    repository.River
	lakeRepo     repository.Lake
	recordsSvc   records.Service
	stationSvc   station.Service
	thoatnuocSvc thoatnuoc.Service
}

// NewWorker constructs a new Worker instance
func NewWorker(
	l logger.Logger,
	riverRepo repository.River,
	lakeRepo repository.Lake,
	recordsSvc records.Service,
	stationSvc station.Service,
	thoatnuocSvc thoatnuoc.Service,
) Worker {
	return &worker{
		logger:       l,
		riverRepo:    riverRepo,
		lakeRepo:     lakeRepo,
		recordsSvc:   recordsSvc,
		stationSvc:   stationSvc,
		thoatnuocSvc: thoatnuocSvc,
	}
}

// Start launches the initial sync and schedules the recurring 5-minute cron job
func (w *worker) Start(ctx context.Context) {
	w.logger.GetLogger().Info(">>> Water Station (River/Lake Auto) Cron Worker is STARTING...")

	// Initial sync on startup
	go func() {
		if err := w.Sync(ctx); err != nil {
			w.logger.GetLogger().Errorf("[WaterWorker] Initial sync error: %v", err)
		}
	}()

	c := cron.New(cron.WithLocation(utils.VietnamLocation))

	// Run cronjob every 5 minutes: "*/5 * * * *"
	_, err := c.AddFunc("*/5 * * * *", func() {
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
