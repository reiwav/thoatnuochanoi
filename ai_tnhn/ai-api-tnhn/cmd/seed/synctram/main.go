package main

import (
	"ai-api-tnhn/config"
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/bootstrap"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type RainStationOld struct {
	Id        int    `json:"Id"`
	TenTram   string `json:"TenTram"`
	TenPhuong string `json:"TenPhuong"`
	DiaChi    string `json:"DiaChi"`
	Lat       string `json:"Lat"`
	Lng       string `json:"Lng"`
	ThuTu     int    `json:"ThuTu"`
	Active    bool   `json:"Active"`
	ManHinh   int    `json:"ManHinh"`
	PhuongId  int    `json:"PhuongId"`
}

type WaterStationOld struct {
	Id          string `json:"Id"`
	TenTram     string `json:"TenTram"`
	TenTramHTML string `json:"TenTramHTML"`
	Loai        string `json:"Loai"` // "1": river, "2": lake
}

func main() {
	_ = godotenv.Load("../../../.env")
	cfg := config.LoadEnv()

	// Initialize Database
	mongoDB, err := bootstrap.InitDatabase(cfg.DB)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	ctx := context.Background()
	l := logger.NewLogger(cfg.LoggerConfig)
	repos := bootstrap.InitRepositories(mongoDB, l)

	// 1. Sync Rain Stations
	fmt.Println("--- Syncing Rain Stations ---")
	syncRainStations(ctx, repos.RainStation)

	// 2. Sync Water Stations (Lake/River)
	fmt.Println("\n--- Syncing Water Stations ---")
	syncWaterStations(ctx, repos.LakeStation, repos.RiverStation)

	fmt.Println("\nSynchronization completed.")
}

func syncRainStations(ctx context.Context, rainRepo repository.RainStation) {
	filePath := "/Users/longtran/Desktop/Golang/ThoatNuocHaNoi/application/ai_tnhn/tools/rainfall_processor/tram_mua_data.json"
	data, err := readJSON[[]RainStationOld](filePath)
	if err != nil {
		log.Printf("Error reading rain stations JSON: %v", err)
		return
	}

	stations, _, err := rainRepo.List(ctx, nil)
	if err != nil {
		log.Printf("Error listing rain stations: %v", err)
		return
	}

	for _, old := range data {
		var target *models.RainStation

		// 1. Match by OldID
		for _, st := range stations {
			if st.OldID == old.Id {
				target = st
				break
			}
		}

		// 2. Fallback to Name
		if target == nil {
			for _, st := range stations {
				if cleanName(st.TenTram) == cleanName(old.TenTram) {
					target = st
					break
				}
			}
		}

		if target != nil {
			// Update
			target.OldID = old.Id
			target.TenTram = old.TenTram
			target.TenPhuong = old.TenPhuong
			target.DiaChi = old.DiaChi
			target.Lat = old.Lat
			target.Lng = old.Lng
			if old.ThuTu > 0 {
				target.ThuTu = old.ThuTu
			}
			target.Active = old.Active
			target.ManHinh = old.ManHinh
			target.PhuongId = old.PhuongId

			err = rainRepo.Update(ctx, target.ID, target)
			if err != nil {
				log.Printf("Failed to update rain station %s: %v", target.TenTram, err)
			} else {
				fmt.Printf("Updated rain station: %s\n", target.TenTram)
			}
		} else {
			// Create new
			newStation := &models.RainStation{
				OldID:     old.Id,
				TenTram:   old.TenTram,
				TenPhuong: old.TenPhuong,
				DiaChi:    old.DiaChi,
				Lat:       old.Lat,
				Lng:       old.Lng,
				ThuTu:     old.ThuTu,
				Active:    old.Active,
				ManHinh:   old.ManHinh,
				PhuongId:  old.PhuongId,
			}
			_, err = rainRepo.Create(ctx, newStation)
			if err != nil {
				log.Printf("Failed to create rain station %s: %v", old.TenTram, err)
			} else {
				fmt.Printf("Created rain station: %s\n", old.TenTram)
			}
		}
	}
}

func syncWaterStations(ctx context.Context, lakeRepo repository.LakeStation, riverRepo repository.RiverStation) {
	filePath := "/Users/longtran/Desktop/Golang/ThoatNuocHaNoi/application/ai_tnhn/tools/rainfall_processor/tram_nuoc.json"
	data, err := readJSON[[]WaterStationOld](filePath)
	if err != nil {
		log.Printf("Error reading water stations JSON: %v", err)
		return
	}

	for _, old := range data {
		oldID, _ := strconv.Atoi(old.Id)

		if old.Loai == "2" { // Lake
			lakes, _, _ := lakeRepo.List(ctx, nil)
			var target *models.LakeStation
			for _, st := range lakes {
				if st.OldID == oldID {
					target = st
					break
				}
			}
			if target == nil {
				for _, st := range lakes {
					if cleanName(st.TenTram) == cleanName(old.TenTram) {
						target = st
						break
					}
				}
			}

			if target != nil {
				target.OldID = oldID
				target.TenTram = old.TenTram
				target.TenTramHTML = old.TenTramHTML
				err = lakeRepo.Update(ctx, target.ID, target)
				if err != nil {
					log.Printf("Failed to update lake station %s: %v", target.TenTram, err)
				} else {
					fmt.Printf("Updated lake station: %s\n", target.TenTram)
				}
			} else {
				newLake := &models.LakeStation{
					OldID:       oldID,
					TenTram:     old.TenTram,
					TenTramHTML: old.TenTramHTML,
					Active:      true,
				}
				_, err = lakeRepo.Create(ctx, newLake)
				if err != nil {
					log.Printf("Failed to create lake station %s: %v", old.TenTram, err)
				} else {
					fmt.Printf("Created lake station: %s\n", old.TenTram)
				}
			}
		} else if old.Loai == "1" { // River
			rivers, _, _ := riverRepo.List(ctx, nil)
			var target *models.RiverStation
			for _, st := range rivers {
				if st.OldID == oldID {
					target = st
					break
				}
			}
			if target == nil {
				for _, st := range rivers {
					if cleanName(st.TenTram) == cleanName(old.TenTram) {
						target = st
						break
					}
				}
			}

			if target != nil {
				target.OldID = oldID
				target.TenTram = old.TenTram
				target.TenTramHTML = old.TenTramHTML
				err = riverRepo.Update(ctx, target.ID, target)
				if err != nil {
					log.Printf("Failed to update river station %s: %v", target.TenTram, err)
				} else {
					fmt.Printf("Updated river station: %s\n", target.TenTram)
				}
			} else {
				newRiver := &models.RiverStation{
					OldID:       oldID,
					TenTram:     old.TenTram,
					TenTramHTML: old.TenTramHTML,
					Active:      true,
				}
				_, err = riverRepo.Create(ctx, newRiver)
				if err != nil {
					log.Printf("Failed to create river station %s: %v", old.TenTram, err)
				} else {
					fmt.Printf("Created river station: %s\n", old.TenTram)
				}
			}
		}
	}
}

func cleanName(name string) string {
	return strings.ToLower(strings.TrimSpace(name))
}

func readJSON[T any](path string) (T, error) {
	var result T
	file, err := os.Open(path)
	if err != nil {
		return result, err
	}
	defer file.Close()

	bytes, err := io.ReadAll(file)
	if err != nil {
		return result, err
	}

	err = json.Unmarshal(bytes, &result)
	return result, err
}
