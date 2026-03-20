package sensor

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"sensor-backend/internal/constants"
	"sensor-backend/internal/models"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Service interface {
	GetMonitorData(ctx context.Context, link string) ([]models.Monitor, error)
	GetAlarms(ctx context.Context, link string) ([]models.Alarm, error)
	GetHistoryTrend(ctx context.Context, link, channel, startStr, endStr string) (interface{}, error)
	GetOutputs(ctx context.Context, link string) ([]models.Output, error)
	ToggleOutput(ctx context.Context, link string, id string, control bool) error
	SeedOutputs(ctx context.Context, link string) error
}

type service struct {
	outputs map[string][]models.Output
	mu      sync.RWMutex
	db      *mongo.Database
}

func NewService(db *mongo.Database) Service {
	return &service{
		outputs: make(map[string][]models.Output),
		db:      db,
	}
}

func (s *service) GetMonitorData(ctx context.Context, link string) ([]models.Monitor, error) {
	link = strings.TrimRight(link, "/")
	apiUrl := link + "/macros/UpdateMonitor1/"
	log.Printf("Calling monitor API: %s\n", apiUrl)
	resp, err := http.Post(apiUrl, "application/json", nil)
	if err != nil {
		return nil, fmt.Errorf("error fetching monitor: %v", err)
	}
	defer resp.Body.Close()

	scanner := bufio.NewScanner(resp.Body)
	now := time.Now()

	var data []models.Monitor

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		tokens := strings.Split(line, ",")
		if len(tokens) >= 6 {
			mma := strings.Split(tokens[0], "/")
			maxV, minV, avgV := "", "", ""
			if len(mma) >= 1 {
				maxV = strings.TrimSpace(mma[0])
			}
			if len(mma) >= 2 {
				minV = strings.TrimSpace(mma[1])
			}
			if len(mma) >= 3 {
				avgV = strings.TrimSpace(mma[2])
			}

			name := strings.TrimSpace(tokens[2])
			orderIndex := 999
			for k, v := range constants.SensorLabels {
				if strings.Contains(strings.ToLower(name), strings.ToLower(v)) {
					orderIndex = int(k)
					name = fmt.Sprintf("%d. %s", k+1, v)
					break
				}
			}

			data = append(data, models.Monitor{
				Order:     fmt.Sprintf("%d", orderIndex), // store sort order here temporarily
				Name:      name,
				Value:     strings.TrimSpace(tokens[3]),
				Unit:      strings.TrimSpace(tokens[4]),
				Status:    strings.TrimSpace(tokens[5]),
				Max:       maxV,
				Min:       minV,
				Avg:       avgV,
				UpdatedAt: now,
			})
		}
	}
	
	// Sort by Order
	sort.Slice(data, func(i, j int) bool {
		var o1, o2 int
		fmt.Sscanf(data[i].Order, "%d", &o1)
		fmt.Sscanf(data[j].Order, "%d", &o2)
		return o1 < o2
	})

	return data, nil
}

func (s *service) GetAlarms(ctx context.Context, link string) ([]models.Alarm, error) {
	link = strings.TrimRight(link, "/")
	apiUrl := link + "/macros/load_alarm_tablet_index/"
	log.Printf("Calling alarms API: %s\n", apiUrl)
	resp, err := http.Post(apiUrl, "application/json", nil)
	if err != nil {
		return nil, fmt.Errorf("error fetching alarms: %v", err)
	}
	defer resp.Body.Close()

	re := regexp.MustCompile(`^(\d+),(\d{4}-\d{2}-\d{2}),(\d{2}:\d{2}:\d{2}),(.*)$`)
	scanner := bufio.NewScanner(resp.Body)

	var data []models.Alarm
	var currentAlarm *models.Alarm

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		matches := re.FindStringSubmatch(line)
		if len(matches) > 0 {
			if currentAlarm != nil {
				data = append(data, *currentAlarm)
			}
			currentAlarm = &models.Alarm{
				AlarmID:   matches[1],
				Date:      matches[2],
				Time:      matches[3],
				Message:   matches[4],
				CreatedAt: time.Now(),
			}
		} else if currentAlarm != nil {
			currentAlarm.Message += "\n" + line
		}
	}
	if currentAlarm != nil {
		data = append(data, *currentAlarm)
	}

	// Limit to last 50 equivalent behavior, but actually we just return what the macro returned
	return data, nil
}

func (s *service) GetHistoryTrend(ctx context.Context, link, channelStr, startStr, endStr string) (interface{}, error) {
	link = strings.TrimRight(link, "/")
	channel, _ := strconv.Atoi(channelStr)

	var startTime, endTime time.Time
	if startStr != "" {
		startTime, _ = time.Parse("2006-01-02", startStr)
		startTime = startTime.Add(-7 * time.Hour) // Align with Vietnam Time (+7) instead of UTC
	} else {
		startTime = time.Now().AddDate(0, 0, -1)
	}

	if endStr != "" {
		endTime, _ = time.Parse("2006-01-02", endStr)
		endTime = endTime.Add(-7 * time.Hour) // Align with Vietnam Time (+7)
	} else {
		endTime = time.Now()
	}
	endTime = endTime.Add(24 * time.Hour) // include fully until 23:59:59

	coll := s.db.Collection("history_trend")
	filter := bson.M{
		"device_link": link,
		"sensor_type": channel,
		"timestamp":   bson.M{"$gte": startTime, "$lte": endTime},
	}

	// Sort by timestamp ascending
	opts := options.Find().SetSort(bson.D{{Key: "timestamp", Value: 1}})

	cursor, err := coll.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("database query error: %v", err)
	}
	defer cursor.Close(ctx)

	var results []models.HistoryTrend
	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}

	return results, nil
}

func (s *service) GetOutputs(ctx context.Context, link string) ([]models.Output, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if _, ok := s.outputs[link]; !ok {
		return []models.Output{}, nil
	}
	return s.outputs[link], nil
}

func (s *service) ToggleOutput(ctx context.Context, link string, idStr string, control bool) error {
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	outs, ok := s.outputs[link]
	if !ok {
		return fmt.Errorf("no outputs for this link")
	}

	for i, out := range outs {
		if out.ID == id {
			s.outputs[link][i].Control = control
			return nil
		}
	}
	return fmt.Errorf("output not found")
}

func (s *service) SeedOutputs(ctx context.Context, link string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.outputs[link]; !ok {
		s.outputs[link] = make([]models.Output, 0)
		names := []string{"Out 1", "Out 2", "Out 3", "Out 4", "Out 5", "Out 6"}
		for i, name := range names {
			control := false
			mode := "Auto"
			if i == 0 || i == 1 || i == 5 {
				mode = "Man"
			}
			s.outputs[link] = append(s.outputs[link], models.Output{
				ID:      primitive.NewObjectID(),
				Name:    name,
				Control: control,
				Mode:    mode,
			})
		}
	}
	return nil
}
