package main

import (
	"ai-api-tnhn/config"
	"ai-api-tnhn/internal/base/mgo/db"
	"ai-api-tnhn/internal/models"
	"context"
	"encoding/json"
	"io"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
	"github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/mongo"
)

type TempRain struct {
	Id        int     `json:"Id"`
	TenTram   string  `json:"TenTram"`
	TenPhuong string  `json:"TenPhuong"`
	DiaChi    string  `json:"DiaChi"`
	Lat       *string `json:"Lat"`
	Lng       *string `json:"Lng"`
	ThuTu     int     `json:"ThuTu"`
	ManHinh   int     `json:"ManHinh"`
	PhuongId  int     `json:"PhuongId"`
	Active    bool    `json:"Active"`
}

type TempWater struct {
	Id          string `json:"Id"`
	TenTram     string `json:"TenTram"`
	TenTramHTML string `json:"TenTramHTML"`
	Loai        string `json:"Loai"`
}

func main() {
	_ = godotenv.Load("../../.env")

	conf := config.LoadEnv()
	log := logrus.New()

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Minute)
	defer cancel()

	log.Info("Connecting to database...")
	mgo, err := db.ConnectMongo(conf.DB)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	database := mgo.DB

	// collections
	//collRain := database.Collection("rain_stations")
	collLake := database.Collection("lake_stations")
	collRiver := database.Collection("river_stations")

	log.Info("Dropping existing collections...")
	//collRain.Drop(ctx)
	collLake.Drop(ctx)
	collRiver.Drop(ctx)

	log.Info("Processing tram_mua.json...")
	//processRainStations(ctx, log, collRain)

	log.Info("Processing tram_nuoc.json...")
	processWaterStations(ctx, log, collLake, collRiver)

	log.Info("Migration completed successfully!")
}

func processRainStations(ctx context.Context, log *logrus.Logger, coll *mongo.Collection) {
	file, err := os.Open("tram_mua.json")
	if err != nil {
		log.Fatalf("Cannot open tram_mua.json: %v", err)
	}
	defer file.Close()

	bytes, err := io.ReadAll(file)
	if err != nil {
		log.Fatalf("Cannot read tram_mua.json: %v", err)
	}

	var tempRains []TempRain
	if err := json.Unmarshal(bytes, &tempRains); err != nil {
		log.Fatalf("Cannot unmarshal tram_mua.json: %v", err)
	}

	var docs []interface{}
	for _, tr := range tempRains {
		lat := ""
		if tr.Lat != nil {
			lat = *tr.Lat
		}
		lng := ""
		if tr.Lng != nil {
			lng = *tr.Lng
		}

		rainStation := models.RainStation{
			OldID:     tr.Id,
			TenTram:   tr.TenPhuong,
			TenPhuong: tr.TenPhuong,
			DiaChi:    tr.DiaChi,
			Lat:       lat,
			Lng:       lng,
			ThuTu:     tr.ThuTu,
			ManHinh:   tr.ManHinh,
			PhuongId:  tr.PhuongId,
			Active:    tr.Active,
		}

		// Initialize base model
		rainStation.BeforeCreate("rain")
		docs = append(docs, rainStation)
	}

	if len(docs) > 0 {
		res, err := coll.InsertMany(ctx, docs)
		if err != nil {
			log.Fatalf("Cannot insert rain stations: %v", err)
		}
		log.Infof("Inserted %d rain stations.", len(res.InsertedIDs))
	}
}

func processWaterStations(ctx context.Context, log *logrus.Logger, collLake *mongo.Collection, collRiver *mongo.Collection) {
	file, err := os.Open("tram_nuoc.json")
	if err != nil {
		log.Fatalf("Cannot open tram_nuoc.json: %v", err)
	}
	defer file.Close()

	bytes, err := io.ReadAll(file)
	if err != nil {
		log.Fatalf("Cannot read tram_nuoc.json: %v", err)
	}

	var tempWaters []TempWater
	if err := json.Unmarshal(bytes, &tempWaters); err != nil {
		log.Fatalf("Cannot unmarshal tram_nuoc.json: %v", err)
	}

	var lakeDocs []interface{}
	var riverDocs []interface{}

	for _, tw := range tempWaters {
		oldId, _ := strconv.Atoi(tw.Id)
		tenTram := tw.TenTram

		if tw.Loai == "1" {
			// River Station
			riverStation := models.RiverStation{
				OldID:     oldId,
				TenTram:   tenTram,
				TenPhuong: tw.TenTramHTML,
				DiaChi:    tw.TenTramHTML,
				Loai:      "river",
				Active:    true,
			}
			riverStation.BeforeCreate("river")
			riverDocs = append(riverDocs, riverStation)
		} else if tw.Loai == "2" {
			// Lake Station
			lakeStation := models.LakeStation{
				OldID:     oldId,
				TenTram:   tenTram,
				TenPhuong: tw.TenTramHTML,
				DiaChi:    tw.TenTramHTML,
				Loai:      "lake",
				Active:    true,
			}
			lakeStation.BeforeCreate("lake")
			lakeDocs = append(lakeDocs, lakeStation)
		}
	}

	if len(lakeDocs) > 0 {
		res, err := collLake.InsertMany(ctx, lakeDocs)
		if err != nil {
			log.Fatalf("Cannot insert lake stations: %v", err)
		}
		log.Infof("Inserted %d lake stations.", len(res.InsertedIDs))
	}

	if len(riverDocs) > 0 {
		res, err := collRiver.InsertMany(ctx, riverDocs)
		if err != nil {
			log.Fatalf("Cannot insert river stations: %v", err)
		}
		log.Infof("Inserted %d river stations.", len(res.InsertedIDs))
	}
}
