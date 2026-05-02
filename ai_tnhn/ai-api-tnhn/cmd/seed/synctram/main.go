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
		log.Fatalf("Failed to list rain stations: %v", err)
	}

	for _, old := range data {
		var target *models.RainStation

		// 1. Match by OldID
		if old.Id != 0 {
			for _, st := range stations {
				if st.OldID == old.Id {
					target = st
					break
				}
			}
		}

		// 2. Fallback to Name + Ward
		if target == nil {
			for _, st := range stations {
				if cleanName(st.TenTram) == cleanName(old.TenTram) && cleanName(st.TenPhuong) == cleanName(old.TenPhuong) {
					target = st
					break
				}
			}
		}

		// 3. Fallback to Address
		if target == nil {
			for _, st := range stations {
				if cleanName(st.DiaChi) != "" && cleanName(st.DiaChi) == cleanName(old.DiaChi) {
					target = st
					break
				}
			}
		}

		// 4. Last fallback to Name only (only match if st.OldID is 0 to avoid stealing ID)
		if target == nil {
			for _, st := range stations {
				if st.OldID == 0 && cleanName(st.TenTram) == cleanName(old.TenTram) {
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
			target.Loai = detectAreaType(old.TenPhuong)

			err = rainRepo.Update(ctx, target.ID, target)
			if err != nil {
				log.Printf("Failed to update rain station %s: %v", target.TenTram, err)
			} else {
				// Update in-memory list to avoid duplicate matches
				for i := range stations {
					if stations[i].ID == target.ID {
						stations[i].OldID = target.OldID
						break
					}
				}
				fmt.Printf("Updated rain station: %s (ID: %d)\n", target.TenTram, target.OldID)
			}
		} else {
			// Create new
			newStation := &models.RainStation{
				OldID:         old.Id,
				TenTram:       old.TenTram,
				TenPhuong:     old.TenPhuong,
				DiaChi:        old.DiaChi,
				Lat:           old.Lat,
				Lng:           old.Lng,
				ThuTu:         old.ThuTu,
				ManHinh:       old.ManHinh,
				PhuongId:      old.PhuongId,
				Active:        old.Active,
				Loai:          detectAreaType(old.TenPhuong),
				OrgID:         "org_001",
				TrongSoBaoCao: 1,
			}
			_, err = rainRepo.Create(ctx, newStation)
			if err != nil {
				log.Printf("Failed to create rain station %s: %v", old.TenTram, err)
			} else {
				fmt.Printf("Created rain station: %s (ID: %d)\n", old.TenTram, old.Id)
			}
		}
	}

	// SPECIAL CASE: Check for Station 33 (Sông Cầu Ngà) if missing from RainStation
	found33 := false
	for _, st := range stations {
		if st.OldID == 33 {
			found33 = true
			break
		}
	}
	if !found33 {
		fmt.Println("Station 33 not found in RainStation, creating from Water data if exists...")
		// We'll manually insert it as requested since it's missing from tram_mua_data.json
		newStation := &models.RainStation{
			OldID:         33,
			TenTram:       "Sông Cầu Ngà",
			DiaChi:        "Trạm bơm Cầu Ngà",
			Active:        true,
			OrgID:         "org_001",
			TrongSoBaoCao: 1,
		}
		_, err = rainRepo.Create(ctx, newStation)
		if err != nil {
			log.Printf("Failed to create special rain station 33: %v", err)
		} else {
			fmt.Println("Created special rain station 33 (Sông Cầu Ngà)")
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

func detectAreaType(tenPhuong string) models.StationAreaType {
	lower := strings.ToLower(tenPhuong)
	if strings.Contains(lower, "phường") {
		return models.StationAreaPhuong
	}
	if strings.Contains(lower, "xã") {
		return models.StationAreaXa
	}
	if strings.Contains(lower, "thị trấn") {
		return models.StationAreaThiTran
	}
	return models.StationAreaNone
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
