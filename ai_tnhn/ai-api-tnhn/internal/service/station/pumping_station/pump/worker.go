package pump

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/models"
	pumpingstation "ai-api-tnhn/internal/service/station/pumping_station"
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
	ticker := time.NewTicker(15 * time.Second)
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
				w.logger.GetLogger().Infof("Starting live sync for station: %s (ID: %s, Link: %s)", s.Name, s.ID, s.Link)
				jobCtx, cancel := context.WithCancel(ctx)
				w.cancelFuncs[s.ID] = cancel
				go w.runSignalRJob(jobCtx, s)
			}
		} else {
			// w.logger.GetLogger().Debugf("Station %s is not auto or has no link", s.Name)
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

	retryDelay := 5 * time.Minute
	maxRetryDelay := 1 * time.Hour

	for {
		select {
		case <-ctx.Done():
			w.logger.GetLogger().Infof("Stopping worker for %s due to context cancellation", station.Name)
			return
		default:
			err := w.connectAndListen(ctx, baseUrl, station)
			if err != nil {
				w.logger.GetLogger().Errorf("SignalR connection error for %s: %v. Retrying in %v...", station.Name, err, retryDelay)

				select {
				case <-ctx.Done():
					return
				case <-time.After(retryDelay):
					// Exponential backoff
					retryDelay *= 2
					if retryDelay > maxRetryDelay {
						retryDelay = maxRetryDelay
					}
					continue
				}
			}
			// Reset retry delay on successful connection
			retryDelay = 5 * time.Minute
		}
	}
}

func (w *worker) connectAndListen(ctx context.Context, baseUrl string, station *models.PumpingStation) error {
	// 1. Negotiate with timeout
	negotiateUrl := fmt.Sprintf("%s/negotiate?clientProtocol=1.5&connectionData=%%5B%%7B%%22name%%22%%3A%%22pumphub%%22%%7D%%5D", baseUrl)

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Get(negotiateUrl)
	if err != nil {
		return fmt.Errorf("negotiate failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("negotiate returned status %d", resp.StatusCode)
	}

	var negData struct {
		ConnectionToken string `json:"ConnectionToken"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&negData); err != nil {
		return fmt.Errorf("decode negotiate response failed: %v", err)
	}

	// 2. Connect via SSE with Context control
	connectUrl := fmt.Sprintf("%s/connect?transport=serverSentEvents&clientProtocol=1.5&connectionToken=%s&connectionData=%%5B%%7B%%22name%%22%%3A%%22pumphub%%22%%7D%%5D", baseUrl, url.QueryEscape(negData.ConnectionToken))

	req, err := http.NewRequestWithContext(ctx, "GET", connectUrl, nil)
	if err != nil {
		return err
	}

	// No global timeout for long-running SSE connection, but we will handle it via Context
	sseClient := &http.Client{}
	connResp, err := sseClient.Do(req)
	if err != nil {
		return fmt.Errorf("SSE connection failed: %v", err)
	}
	defer connResp.Body.Close()

	if connResp.StatusCode != http.StatusOK {
		return fmt.Errorf("SSE returned status %d", connResp.StatusCode)
	}

	// Use a scanner with a custom split function or just read line by line
	// We'll use a timer to detect if we stop receiving data (stuck connection)
	heartbeatTimeout := 5 * time.Minute
	timer := time.NewTimer(heartbeatTimeout)
	defer timer.Stop()

	// Monitoring goroutine to close connection if no heartbeat
	done := make(chan bool)
	go func() {
		select {
		case <-timer.C:
			w.logger.GetLogger().Warnf("SignalR connection for %s timed out (no data for %v). Forcing reconnect.", station.Name, heartbeatTimeout)
			connResp.Body.Close() // This will cause scanner.Scan() to fail
		case <-done:
			return
		}
	}()
	defer close(done)

	scanner := bufio.NewScanner(connResp.Body)
	for scanner.Scan() {
		// Reset timer on any received data
		if !timer.Stop() {
			select {
			case <-timer.C:
			default:
			}
		}
		timer.Reset(heartbeatTimeout)

		line := scanner.Text()
		if strings.HasPrefix(line, "data: ") {
			data := strings.TrimPrefix(line, "data: ")
			if data == "initialized" || data == "{}" {
				continue
			}
			w.logger.GetLogger().Infof("Received SignalR data for %s: %s", station.Name, data)
			w.handleIncomingData(ctx, station, data)
		}
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("scanner error: %v", err)
	}

	return nil
}

func (w *worker) handleIncomingData(ctx context.Context, station *models.PumpingStation, raw string) {
	var res SignalRResponse
	if err := json.Unmarshal([]byte(raw), &res); err != nil {
		w.logger.GetLogger().Errorf("Failed to unmarshal SignalR data for %s: %v. Raw: %s", station.Name, err, raw)
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
		w.logger.GetLogger().Warnf("Skipping pump status for %s: expected at least 120 args, got %d", station.Name, len(args))
		return
	}

	operating := 0
	closed := 0
	maintenance := 0
	noSignal := 0

	// Each pump has 6 fields
	// We use the station.PumpCount to limit or the 120 args (max 20 pumps)
	maxPumps := station.PumpCount
	if maxPumps > 20 {
		maxPumps = 20
	}

	for i := 0; i < maxPumps; i++ {
		offset := i * 6

		// Check No Signal (All 6 params are 0)
		isNoSignal := true
		for j := 0; j < 6; j++ {
			val := fmt.Sprintf("%v", args[offset+j])
			if val != "0" && val != "0.0" && val != "<nil>" && val != "" {
				isNoSignal = false
				break
			}
		}

		if isNoSignal {
			noSignal++
			continue
		}

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
		NoSignalCount:    noSignal,
	}

	_, err := w.service.CreateHistory(ctx, nil, history)
	if err != nil {
		w.logger.GetLogger().Errorf("Failed to save pumping station history for %s: %v", station.Name, err)
	}
}
