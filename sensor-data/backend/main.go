package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/robfig/cron/v3"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"
)

// --- Models ---

type User struct {
	ID       primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Username string             `bson:"username" json:"username"`
	Password string             `bson:"password" json:"-"`
}

type Calibration struct {
	ID      primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Channel string             `bson:"channel" json:"channel"`
	Value   string             `bson:"value" json:"value"`
	Gain    string             `bson:"gain" json:"gain"`
	Offset  string             `bson:"offset" json:"offset"`
	Real    string             `bson:"real" json:"real"`
	Unit    string             `bson:"unit" json:"unit"`
	Status  string             `bson:"status" json:"status"`
}

type Alarm struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	AlarmID   string             `bson:"alarm_id" json:"alarmId"`
	Date      string             `bson:"date" json:"date"`
	Time      string             `bson:"time" json:"time"`
	Message   string             `bson:"message" json:"message"`
	CreatedAt time.Time          `bson:"created_at" json:"createdAt"`
}

type Monitor struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Order     string             `bson:"order" json:"order"`
	Name      string             `bson:"name" json:"name"`
	Value     string             `bson:"value" json:"value"`
	Unit      string             `bson:"unit" json:"unit"`
	Status    string             `bson:"status" json:"status"`
	Max       string             `bson:"max" json:"max"`
	Min       string             `bson:"min" json:"min"`
	Avg       string             `bson:"avg" json:"avg"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updatedAt"`
}

type Output struct {
	ID      primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name    string             `bson:"name" json:"name"`
	Control bool               `bson:"control" json:"control"` // ON/OFF
	Mode    string             `bson:"mode" json:"mode"`       // Man/Auto
}

type HistoryPoint struct {
	Timestamp time.Time          `bson:"timestamp" json:"timestamp"`
	Data      map[string]float64 `bson:"data" json:"data"`
}

// --- Global Vars ---

var client *mongo.Client
var db *mongo.Database
var jwtKey = []byte("super_secret_key")

type Claims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// --- DB Logic ---

func initDB() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	mongoURI := "mongodb://localhost:27017"
	c, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatal(err)
	}

	err = c.Ping(ctx, nil)
	if err != nil {
		log.Fatal("Could not connect to MongoDB:", err)
	}

	fmt.Println("Connected to MongoDB!")
	client = c
	db = client.Database("sensor_db")

	seedAdmin()
	seedOutputs()
}

func seedAdmin() {
	userCol := db.Collection("users")
	var user User
	err := userCol.FindOne(context.Background(), bson.M{"username": "admin"}).Decode(&user)
	if err == mongo.ErrNoDocuments {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)
		_, err := userCol.InsertOne(context.Background(), bson.M{
			"username": "admin",
			"password": string(hashedPassword),
		})
		if err == nil {
			fmt.Println("Admin user seeded: admin / 123456")
		}
	}
}

func seedOutputs() {
	outCol := db.Collection("outputs")
	count, _ := outCol.CountDocuments(context.Background(), bson.M{})
	if count == 0 {
		names := []string{"Out 1", "Out 2", "Out 3", "Out 4", "Out 5", "Out 6"}
		for i, name := range names {
			control := false
			mode := "Auto"
			if i == 0 || i == 1 || i == 5 {
				mode = "Man"
			}
			outCol.InsertOne(context.Background(), Output{Name: name, Control: control, Mode: mode})
		}
		fmt.Println("Outputs seeded!")
	}
}

// --- Scraping Services ---

func fetchCalibrations() {
	apiUrl := "http://14.224.214.119:8880/macros/load_calibrationsetting/"
	resp, err := http.Post(apiUrl, "application/json", nil)
	if err != nil {
		log.Println("Error fetching calibrations:", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return
	}

	body, _ := io.ReadAll(resp.Body)
	tokens := strings.Split(string(body), ";")

	col := db.Collection("calibrations")
	col.Drop(context.Background()) 

	var currentRow []string
	for _, token := range tokens {
		clean := strings.TrimSpace(token)
		currentRow = append(currentRow, clean)

		if len(currentRow) == 8 {
			cal := Calibration{
				Channel: currentRow[2],
				Value:   currentRow[3],
				Gain:    currentRow[0],
				Offset:  currentRow[1],
				Real:    currentRow[4],
				Unit:    currentRow[5],
				Status:  currentRow[7],
			}
			col.InsertOne(context.Background(), cal)
			currentRow = nil
		}
	}
	fmt.Printf("[%s] Calibrations updated\n", time.Now().Format("15:04:05"))
}

func fetchAlarms() {
	apiUrl := "http://14.224.214.175:8880/macros/load_alarm_tablet_index/"
	resp, err := http.Post(apiUrl, "application/json", nil)
	if err != nil {
		log.Println("Error fetching alarms:", err)
		return
	}
	defer resp.Body.Close()

	col := db.Collection("alarms")
	re := regexp.MustCompile(`^(\d+),(\d{4}-\d{2}-\d{2}),(\d{2}:\d{2}:\d{2}),(.*)$`)
	scanner := bufio.NewScanner(resp.Body)

	var currentAlarm *Alarm

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		matches := re.FindStringSubmatch(line)
		if len(matches) > 0 {
			if currentAlarm != nil {
				filter := bson.M{"alarm_id": currentAlarm.AlarmID, "date": currentAlarm.Date, "time": currentAlarm.Time}
				col.UpdateOne(context.Background(), filter, bson.M{"$set": currentAlarm}, options.Update().SetUpsert(true))
			}
			currentAlarm = &Alarm{
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
		filter := bson.M{"alarm_id": currentAlarm.AlarmID, "date": currentAlarm.Date, "time": currentAlarm.Time}
		col.UpdateOne(context.Background(), filter, bson.M{"$set": currentAlarm}, options.Update().SetUpsert(true))
	}
	fmt.Printf("[%s] Alarms updated\n", time.Now().Format("15:04:05"))
}

func fetchMonitor() {
	apiUrl := "http://14.224.214.175:8880/macros/UpdateMonitor1/"
	resp, err := http.Post(apiUrl, "application/json", nil)
	if err != nil {
		log.Println("Error fetching monitor:", err)
		return
	}
	defer resp.Body.Close()

	col := db.Collection("monitors")
	scanner := bufio.NewScanner(resp.Body)
	now := time.Now()

	var monitorBatch []interface{}

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		tokens := strings.Split(line, ",")
		if len(tokens) >= 6 {
			mma := strings.Split(tokens[0], "/")
			maxV, minV, avgV := "", "", ""
			if len(mma) >= 1 { maxV = strings.TrimSpace(mma[0]) }
			if len(mma) >= 2 { minV = strings.TrimSpace(mma[1]) }
			if len(mma) >= 3 { avgV = strings.TrimSpace(mma[2]) }

			mon := Monitor{
				Order:     strings.TrimSpace(tokens[1]),
				Name:      strings.TrimSpace(tokens[2]),
				Value:     strings.TrimSpace(tokens[3]),
				Unit:      strings.TrimSpace(tokens[4]),
				Status:    strings.TrimSpace(tokens[5]),
				Max:       maxV,
				Min:       minV,
				Avg:       avgV,
				UpdatedAt: now,
			}
			monitorBatch = append(monitorBatch, mon)
		}
	}
	if len(monitorBatch) > 0 {
		col.InsertMany(context.Background(), monitorBatch)
	}
	fmt.Printf("[%s] Monitor data logged (History + Latest)\n", now.Format("15:04:05"))
}

func fetchHistory() {
	apiUrl := "http://14.224.214.175:8880/macros/load_historytrend_index/"
	resp, err := http.Post(apiUrl, "application/json", nil)
	if err != nil {
		log.Println("Error fetching history:", err)
		return
	}
	defer resp.Body.Close()

	var raw struct {
		Datas []struct {
			Name string      `json:"name"`
			Data [][]float64 `json:"data"`
		} `json:"datas"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return
	}

	col := db.Collection("sensor_history")
	for _, series := range raw.Datas {
		name := strings.TrimSpace(series.Name)
		for _, point := range series.Data {
			if len(point) >= 2 {
				ts := time.UnixMilli(int64(point[0]))
				val := point[1]

				filter := bson.M{"timestamp": ts}
				update := bson.M{"$set": bson.M{fmt.Sprintf("data.%s", name): val}}
				col.UpdateOne(context.Background(), filter, update, options.Update().SetUpsert(true))
			}
		}
	}
	fmt.Printf("[%s] History updated\n", time.Now().Format("15:04:05"))
}

// --- Handlers ---

func loginHandler(c *gin.Context) {
	var input struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(400, gin.H{"error": "Invalid input"})
		return
	}

	var user User
	err := db.Collection("users").FindOne(context.Background(), bson.M{"username": input.Username}).Decode(&user)
	if err != nil {
		c.JSON(401, gin.H{"error": "User not found"})
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password))
	if err != nil {
		c.JSON(401, gin.H{"error": "Incorrect password"})
		return
	}

	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		Username: user.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, _ := token.SignedString(jwtKey)

	c.JSON(200, gin.H{"token": tokenString, "username": user.Username})
}

func getMonitorData(c *gin.Context) {
	col := db.Collection("monitors")
	
	// Step 1: Find the latest common timestamp
	opts := options.FindOne().SetSort(bson.D{{Key: "updated_at", Value: -1}})
	var latestDoc Monitor
	err := col.FindOne(context.Background(), bson.M{}, opts).Decode(&latestDoc)
	if err != nil {
		c.JSON(200, []Monitor{})
		return
	}

	// Step 2: Fetch all records matching that timestamp
	cursor, err := col.Find(context.Background(), bson.M{"updated_at": latestDoc.UpdatedAt})
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	var data []Monitor
	if err := cursor.All(context.Background(), &data); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, data)
}

func getAlarms(c *gin.Context) {
	sort := bson.D{{Key: "date", Value: -1}, {Key: "time", Value: -1}}
	cursor, err := db.Collection("alarms").Find(context.Background(), bson.M{}, options.Find().SetSort(sort).SetLimit(50))
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	var data []Alarm
	if err := cursor.All(context.Background(), &data); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, data)
}

func getHistory(c *gin.Context) {
	startTimeStr := c.Query("startTime")
	endTimeStr := c.Query("endTime")

	filter := bson.M{}
	if startTimeStr != "" || endTimeStr != "" {
		timeFilter := bson.M{}
		if startTimeStr != "" {
			st, _ := time.Parse(time.RFC3339, startTimeStr)
			timeFilter["$gte"] = st
		}
		if endTimeStr != "" {
			et, _ := time.Parse(time.RFC3339, endTimeStr)
			timeFilter["$lte"] = et
		}
		filter["timestamp"] = timeFilter
	}

	cursor, err := db.Collection("sensor_history").Find(context.Background(), filter, options.Find().SetSort(bson.D{{Key: "timestamp", Value: -1}}).SetLimit(500))
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	var data []HistoryPoint
	if err := cursor.All(context.Background(), &data); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, data)
}

func getCalibrations(c *gin.Context) {
	cursor, err := db.Collection("calibrations").Find(context.Background(), bson.M{})
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	var data []Calibration
	if err := cursor.All(context.Background(), &data); err != nil {
		c.JSON(500, gin.H{"error": "Decode error: " + err.Error()})
		return
	}
	c.JSON(200, data)
}

func getOutputs(c *gin.Context) {
	cursor, err := db.Collection("outputs").Find(context.Background(), bson.M{})
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	var data []Output
	cursor.All(context.Background(), &data)
	c.JSON(200, data)
}

func toggleOutput(c *gin.Context) {
	idStr := c.Param("id")
	oid, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid ID format"})
		return
	}
	var input struct {
		Control bool `json:"control"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(400, gin.H{"error": "Invalid input"})
		return
	}
	// Logic to update output in DB
	filter := bson.M{"_id": oid}
	db.Collection("outputs").UpdateOne(context.Background(), filter, bson.M{"$set": bson.M{"control": input.Control}})
	c.JSON(200, gin.H{"status": "ok"})
}

func main() {
	initDB()

	go func() {
		fetchCalibrations()
		fetchAlarms()
		fetchMonitor()
		fetchHistory()
	}()

	cr := cron.New()
	cr.AddFunc("*/5 * * * *", func() {
		fetchCalibrations()
		fetchAlarms()
		fetchMonitor()
		fetchHistory()
	})
	cr.Start()

	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"}, 
		AllowMethods:     []string{"POST", "GET", "OPTIONS", "PATCH"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	r.POST("/api/auth/login", loginHandler)

	authorized := r.Group("/api")
	{
		authorized.GET("/data/monitor", getMonitorData)
		authorized.GET("/data/alarms", getAlarms)
		authorized.GET("/data/history", getHistory)
		authorized.GET("/data/calibration", getCalibrations)
		authorized.GET("/data/outputs", getOutputs)
		authorized.PATCH("/data/outputs/:id", toggleOutput)
	}

	fmt.Println("Backend running on :8080")
	r.Run(":8080")
}
