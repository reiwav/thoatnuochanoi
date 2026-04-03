package pump

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/models"
	pumpingstation "ai-api-tnhn/internal/service/pumping_station"
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

type Worker interface {
	Start(ctx context.Context)
	Restart(ctx context.Context)
}

type worker struct {
	logger      logger.Logger
	service     pumpingstation.Service
	mu          sync.RWMutex
	cancelFuncs map[string]context.CancelFunc
}

func NewWorker(l logger.Logger, s pumpingstation.Service) Worker {
	return &worker{
		logger:      l,
		service:     s,
		cancelFuncs: make(map[string]context.CancelFunc),
	}
}

func (w *worker) Start(ctx context.Context) {
	w.logger.GetLogger().Info("Starting Pumping Station Background Worker...")
	go w.watchStations(ctx)
}

func (w *worker) Restart(ctx context.Context) {
	w.logger.GetLogger().Info("Restarting Pumping Station Worker...")
	w.mu.Lock()
	for id, cancel := range w.cancelFuncs {
		cancel()
		delete(w.cancelFuncs, id)
	}
	w.mu.Unlock()
}

func (w *worker) watchStations(ctx context.Context) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.syncStations(ctx)
		}
	}
}

func (w *worker) syncStations(ctx context.Context) {
	stations, _, err := w.service.List(ctx, nil)
	if err != nil {
		w.logger.GetLogger().Errorf("Failed to list stations for worker: %v", err)
		return
	}

	w.mu.Lock()
	defer w.mu.Unlock()

	for _, s := range stations {
		if s.IsAuto && s.Link != "" {
			if _, ok := w.cancelFuncs[s.ID]; !ok {
				w.logger.GetLogger().Infof("Starting live sync for station: %s", s.Name)
				jobCtx, cancel := context.WithCancel(ctx)
				w.cancelFuncs[s.ID] = cancel
				go w.runSignalRJob(jobCtx, s)
			}
		} else {
			if cancel, ok := w.cancelFuncs[s.ID]; ok {
				w.logger.GetLogger().Infof("Stopping live sync for station: %s", s.Name)
				cancel()
				delete(w.cancelFuncs, s.ID)
			}
		}
	}
}

type SignalRMessage struct {
	H string        `json:"H"`
	M string        `json:"M"`
	A []interface{} `json:"A"`
}

type SignalRResponse struct {
	C string           `json:"C"`
	M []SignalRMessage `json:"M"`
}

func (w *worker) runSignalRJob(ctx context.Context, station *models.PumpingStation) {
	baseUrl := strings.TrimRight(station.Link, "/")
	if !strings.HasSuffix(baseUrl, "/signalr") {
		baseUrl += "/signalr"
	}

	for {
		select {
		case <-ctx.Done():
			return
		default:
			err := w.connectAndListen(ctx, baseUrl, station)
			if err != nil {
				w.logger.GetLogger().Errorf("SignalR connection error for %s: %v. Retrying in 10s...", station.Name, err)
				time.Sleep(10 * time.Second)
			}
		}
	}
}

func (w *worker) connectAndListen(ctx context.Context, baseUrl string, station *models.PumpingStation) error {
	// 1. Negotiate
	negotiateUrl := fmt.Sprintf("%s/negotiate?clientProtocol=1.5&connectionData=%%5B%%7B%%22name%%22%%3A%%22pumphub%%22%%7D%%5D", baseUrl)
	resp, err := http.Get(negotiateUrl)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var negData struct {
		ConnectionToken string `json:"ConnectionToken"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&negData); err != nil {
		return err
	}

	// 2. Connect via SSE
	connectUrl := fmt.Sprintf("%s/connect?transport=serverSentEvents&clientProtocol=1.5&connectionToken=%s&connectionData=%%5B%%7B%%22name%%22%%3A%%22pumphub%%22%%7D%%5D", baseUrl, url.QueryEscape(negData.ConnectionToken))
	
	req, err := http.NewRequestWithContext(ctx, "GET", connectUrl, nil)
	if err != nil {
		return err
	}

	client := &http.Client{}
	connResp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer connResp.Body.Close()

	scanner := bufio.NewScanner(connResp.Body)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "data: ") {
			data := strings.TrimPrefix(line, "data: ")
			if data == "initialized" {
				continue
			}
			w.handleIncomingData(ctx, station, data)
		}
	}

	if err := scanner.Err(); err != nil {
		return err
	}

	return nil
}

func (w *worker) handleIncomingData(ctx context.Context, station *models.PumpingStation, raw string) {
	var res SignalRResponse
	if err := json.Unmarshal([]byte(raw), &res); err != nil {
		return
	}

	for _, msg := range res.M {
		if msg.M == "rcvPumpStatus" {
			w.parseAndSaveStatus(ctx, station, msg.A)
		}
	}
}

func (w *worker) parseAndSaveStatus(ctx context.Context, station *models.PumpingStation, args []interface{}) {
	if len(args) < 120 {
		return
	}

	operating := 0
	closed := 0
	maintenance := 0

	// Each pump has 6 fields
	// 5 Ordinary + 15 Emergency = 20 pumps
	for i := 0; i < 20; i++ {
		offset := i * 6
		on := fmt.Sprintf("%v", args[offset])
		fault := fmt.Sprintf("%v", args[offset+1])

		if fault == "1" {
			maintenance++
		} else if on == "1" {
			operating++
		} else {
			closed++
		}
	}

	// Save history (Service handles deduplication)
	history := &models.PumpingStationHistory{
		StationID:        station.ID,
		OperatingCount:   operating,
		ClosedCount:      closed,
		MaintenanceCount: maintenance,
	}

	_, _ = w.service.CreateHistory(ctx, nil, history)
}
