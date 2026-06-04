package rain

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/integration/thoatnuoc"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/setting"
	"ai-api-tnhn/internal/service/station"
	"context"
	"fmt"
	"sync"
	"time"
)

type Worker interface {
	Start(ctx context.Context)
	SetSessionID(sessionID string)
	SyncWithProgress(ctx context.Context, progressChan chan<- string)
}

type worker struct {
	logger       logger.Logger
	rainRepo     repository.Rain
	stationSvc   station.Service
	thoatnuocSvc thoatnuoc.Service
	sessionID    string
	mu           sync.RWMutex
}

// ASP.NET_SessionId=kzela2aw0gdvzxvrthicl14n
func NewWorker(l logger.Logger, settingSvc setting.Service, rain repository.Rain, stationSvc station.Service, thoatnuocSvc thoatnuoc.Service) Worker {
	ctx := context.Background()
	sessionID := "kzela2aw0gdvzxvrthicl14n"
	setting, _ := settingSvc.GetRainSetting(ctx)
	if setting != nil {
		sessionID = setting.SessionID
	}
	return &worker{
		logger:       l,
		rainRepo:     rain,
		stationSvc:   stationSvc,
		thoatnuocSvc: thoatnuocSvc,
		sessionID:    sessionID,
	}
}

func (w *worker) SetSessionID(sessionID string) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.sessionID = sessionID
	w.logger.GetLogger().Infof("RainWorker: SessionID updated to %s", sessionID)
}

func (w *worker) Start(ctx context.Context) {
	w.logger.GetLogger().Info(">>> Rain Station Data Worker is STARTING...")
	go w.run(ctx)
}

func (w *worker) run(ctx context.Context) {
	loc, _ := time.LoadLocation("Asia/Ho_Chi_Minh")

	// Initial sync on startup
	w.sync(ctx)

	for {
		now := time.Now().In(loc)
		next := time.Date(now.Year(), now.Month(), now.Day(), 7, 1, 0, 0, loc)
		if !now.Before(next) {
			next = next.AddDate(0, 0, 1)
		}
		duration := next.Sub(now)

		select {
		case <-ctx.Done():
			return
		case <-time.After(duration):
			w.sync(ctx)
		}
	}
}

func (w *worker) sync(ctx context.Context) {
	stations, err := w.stationSvc.GetAllRainStations(ctx)
	if err != nil {
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
		// Scan back up to 5 days if no records found
		startDate = time.Now().AddDate(0, 0, -7)
	}

	// Iterate from startDate to today
	now := time.Now()
	totalInserted := 0
	for d := startDate; !d.After(now); d = d.AddDate(0, 0, 1) {
		inserted, _, _ := w.fetchAndSave(ctx, s, d, latest)
		totalInserted += inserted
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
			//w.logger.GetLogger().Infof("RainWorker: Saved marker (0) for station %s at %v to avoid re-scan", s.TenTram, markerTime)
		}
	}
}

func (w *worker) SyncWithProgress(ctx context.Context, progressChan chan<- string) {
	stations, err := w.stationSvc.GetAllRainStations(ctx)
	if err != nil {
		progressChan <- fmt.Sprintf("Lỗi lấy danh sách trạm lượng mưa: %v", err)
		return
	}

	activeStations := 0
	for _, s := range stations {
		if s.Active {
			activeStations++
		}
	}
	progressChan <- fmt.Sprintf("Bắt đầu đồng bộ dữ liệu cho %d trạm lượng mưa đang hoạt động...", activeStations)

	count := 0
	for _, s := range stations {
		if !s.Active {
			continue
		}
		count++
		progressChan <- fmt.Sprintf("[%d/%d] Đang đồng bộ trạm: %s (ID: %d)...", count, activeStations, s.TenTram, s.OldID)
		w.syncStationWithProgress(ctx, s, progressChan)
		time.Sleep(time.Millisecond * 100)
	}

	progressChan <- "Hoàn thành đồng bộ toàn bộ trạm đo mưa."
}

func (w *worker) syncStationWithProgress(ctx context.Context, s *models.RainStation, progressChan chan<- string) {
	latest, err := w.rainRepo.GetLatest(ctx, int64(s.OldID))
	var startDate time.Time
	if err == nil && latest != nil {
		startDate = latest.Timestamp
	} else {
		startDate = time.Now().AddDate(0, 0, -7)
	}

	now := time.Now()
	totalInserted := 0
	var maxRain float64
	var maxRainDate string
	var lastErr error
	hasData := false

	// Tính tổng số ngày đồng bộ
	totalDays := 0
	for d := startDate; !d.After(now); d = d.AddDate(0, 0, 1) {
		totalDays++
	}

	dayCount := 0
	for d := startDate; !d.After(now); d = d.AddDate(0, 0, 1) {
		dayCount++
		dateStr := d.Format("2006-01-02")
		inserted, mRain, fetchErr := w.fetchAndSave(ctx, s, d, latest)
		
		if fetchErr != nil {
			lastErr = fetchErr
			progressChan <- fmt.Sprintf("  - [%d/%d] Ngày %s: Lỗi đồng bộ: %v", dayCount, totalDays, dateStr, fetchErr)
		} else {
			totalInserted += inserted
			if inserted > 0 {
				hasData = true
				if mRain > maxRain {
					maxRain = mRain
					maxRainDate = dateStr
				}
				progressChan <- fmt.Sprintf("  - [%d/%d] Ngày %s: Đồng bộ thành công (Đã lưu %d bản ghi mới, Lượng mưa: %.1f mm)", dayCount, totalDays, dateStr, inserted, mRain)
			} else if mRain > 0 {
				if mRain > maxRain {
					maxRain = mRain
					maxRainDate = dateStr
				}
				progressChan <- fmt.Sprintf("  - [%d/%d] Ngày %s: Đồng bộ thành công (Dữ liệu đã tồn tại, Lượng mưa: %.1f mm)", dayCount, totalDays, dateStr, mRain)
			} else {
				progressChan <- fmt.Sprintf("  - [%d/%d] Ngày %s: Không ghi nhận lượng mưa.", dayCount, totalDays, dateStr)
			}
		}
		// Độ trễ nhỏ để log cuộn mượt mà trên UI
		time.Sleep(time.Millisecond * 30)
	}

	if totalInserted == 0 {
		markerTime := now.AddDate(0, 0, -1)
		if latest == nil || markerTime.After(latest.Timestamp) {
			record := &models.RainRecord{
				StationID:   int64(s.OldID),
				StationName: s.TenTram,
				Date:        markerTime.Format("2006-01-02"),
				Timestamp:   markerTime,
				Value:       0,
			}
			_ = w.rainRepo.Create(ctx, record)
		}
	}

	if lastErr != nil && totalInserted == 0 {
		progressChan <- fmt.Sprintf("  => Trạm %s (ID: %d): Kết thúc với lỗi: %v", s.TenTram, s.OldID, lastErr)
	} else if hasData {
		progressChan <- fmt.Sprintf("  => Trạm %s (ID: %d): Hoàn thành (Lưu tổng cộng %d bản ghi mới, Lượng mưa lớn nhất: %.1f mm vào ngày %s)", s.TenTram, s.OldID, totalInserted, maxRain, maxRainDate)
	} else {
		progressChan <- fmt.Sprintf("  => Trạm %s (ID: %d): Hoàn thành (Dữ liệu cập nhật đầy đủ, không có bản ghi mới)", s.TenTram, s.OldID)
	}
}

func (w *worker) fetchAndSave(ctx context.Context, s *models.RainStation, date time.Time, latest *models.RainRecord) (int, float64, error) {
	dateStr := date.Format("2006-01-02")
	//w.logger.GetLogger().Infof("RainWorker: [DEBUG] Fetching data for station %s (%d) on %s", s.TenTram, s.OldID, dateStr)

	w.mu.RLock()
	sid := w.sessionID
	w.mu.RUnlock()
	dataPoints, err := w.thoatnuocSvc.GetRainChartData(ctx, sid, s.OldID, dateStr)
	if err != nil {
		//w.logger.GetLogger().Errorf("RainWorker: Failed to fetch data for station %s on %s: %v", s.TenTram, dateStr, err)
		return 0, 0, err
	}

	if len(dataPoints) == 0 {
		//w.logger.GetLogger().Infof("RainWorker: [DEBUG] No data points returned for station %s on %s", s.TenTram, dateStr)
		return 0, 0, nil
	}

	// Find the maximum rain value
	maxRain := 0.0
	for _, dp := range dataPoints {
		if dp.LuongMua > maxRain {
			maxRain = dp.LuongMua
		}
	}
	w.logger.GetLogger().Infof("RainWorker: Trạm %s (%s) - Lượng mưa lớn nhất: %.1f mm", s.TenTram, dateStr, maxRain)

	inserted := 0
	skipped := 0
	for _, dp := range dataPoints {
		ts, err := time.ParseInLocation("2006-01-02T15:04:05", dp.ThoiGian, time.Local)
		if err != nil {
			//w.logger.GetLogger().Errorf("RainWorker: [DEBUG] Failed to parse timestamp %s: %v", dp.ThoiGian, err)
			continue
		}

		// Cutoff check: do not save any timestamp strictly after 07:00:00 AM of today
		now := time.Now()
		cutoff := time.Date(now.Year(), now.Month(), now.Day(), 7, 0, 0, 0, time.Local)
		if ts.After(cutoff) {
			skipped++
			continue
		}

		// Skip if already in DB (check against latest timestamp)
		if latest != nil && !ts.In(time.UTC).After(latest.Timestamp.In(time.UTC)) {
			skipped++
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
			//w.logger.GetLogger().Errorf("RainWorker: Failed to save record for %s at %v: %v", s.TenTram, ts, err)
			continue
		}
		inserted++
	}

	//w.logger.GetLogger().Infof("RainWorker: Finished station %s on %s. Inserted: %d, Skipped: %d", s.TenTram, dateStr, inserted, skipped)
	return inserted, maxRain, nil
}
