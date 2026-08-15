package report

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/google/googleapi"
	"ai-api-tnhn/internal/service/weather"
	"context"
	"fmt"
	"sort"

	"go.mongodb.org/mongo-driver/bson"
)

type rainReportTables struct {
	PhuongDataRaw    [][]string
	XaDataRaw        [][]string
	AllPhuongDataRaw [][]string
	AllXaDataRaw     [][]string
}

func (s *service) buildRainStationTables(ctx context.Context, city *googleapi.CityStatus) rainReportTables {
	phuongDataRaw := [][]string{{"Phường", "Lượng mưa (mm)"}}
	xaDataRaw := [][]string{{"Xã", "Lượng mưa (mm)"}}
	allPhuongDataRaw := [][]string{{"Phường", "Lượng mưa (mm)"}}
	allXaDataRaw := [][]string{{"Xã", "Lượng mưa (mm)"}}

	var rainStations []*models.RainStation
	_ = s.rainStationRepo.R_SelectManyWithSort(ctx, bson.M{}, bson.M{"trong_so_bao_cao": 1}, &rainStations)

	if city.Weather != nil {
		mMap := make(map[int]float64)
		for _, m := range city.Weather.Measurements {
			mMap[m.OldID] = m.TotalRain
		}

		type stationRain struct {
			rs   *models.RainStation
			rain float64
		}
		var phuongs, xas []stationRain
		for _, rs := range rainStations {
			sr := stationRain{rs: rs, rain: mMap[rs.OldID]}
			if rs.Loai == models.StationAreaXa {
				xas = append(xas, sr)
			} else {
				phuongs = append(phuongs, sr)
			}
		}

		// Sắp xếp Phường: Mưa lớn nhất lên đầu
		sort.Slice(phuongs, func(i, j int) bool {
			return phuongs[i].rain > phuongs[j].rain
		})

		// Sắp xếp Xã: Có mưa lên đầu, sau đó theo trọng số tăng dần
		sort.Slice(xas, func(i, j int) bool {
			iHasRain := xas[i].rain > 0
			jHasRain := xas[j].rain > 0
			if iHasRain != jHasRain {
				return iHasRain
			}
			return xas[i].rs.TrongSoBaoCao < xas[j].rs.TrongSoBaoCao
		})

		// Phụ lục: Thống kê toàn bộ các trạm Phường và Xã
		for _, p := range phuongs {
			allPhuongDataRaw = append(allPhuongDataRaw, []string{p.rs.TenTram, fmt.Sprintf("%.1f", p.rain)})
		}
		for _, x := range xas {
			allXaDataRaw = append(allXaDataRaw, []string{x.rs.TenTram, fmt.Sprintf("%.1f", x.rain)})
		}

		// Báo cáo chính: Giữ nguyên top 10 Phường và top 10 Xã
		phuongsReport := phuongs
		if len(phuongsReport) > 10 {
			phuongsReport = phuongsReport[:10]
		}
		xasReport := xas
		if len(xasReport) > 10 {
			xasReport = xasReport[:10]
		}

		for _, p := range phuongsReport {
			phuongDataRaw = append(phuongDataRaw, []string{p.rs.TenTram, fmt.Sprintf("%.1f", p.rain)})
		}
		for _, x := range xasReport {
			xaDataRaw = append(xaDataRaw, []string{x.rs.TenTram, fmt.Sprintf("%.1f", x.rain)})
		}
	}

	return rainReportTables{
		PhuongDataRaw:    phuongDataRaw,
		XaDataRaw:        xaDataRaw,
		AllPhuongDataRaw: allPhuongDataRaw,
		AllXaDataRaw:     allXaDataRaw,
	}
}

func (s *service) formatRainTime(rainSum *weather.RainSummaryData) string {
	if rainSum == nil || rainSum.StartTimeFull.IsZero() || rainSum.EndTimeFull.IsZero() {
		return ""
	}
	return fmt.Sprintf("%s đến %s", rainSum.StartTimeFull.Format("15h04'"), rainSum.EndTimeFull.Format("15h04'"))
}
