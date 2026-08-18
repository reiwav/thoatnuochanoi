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
	phuongDataRaw := [][]string{{"STT", "Phường", "Đo tại", "Lượng mưa (mm)", "Biểu đồ mưa"}}
	xaDataRaw := [][]string{{"STT", "Xã", "Đo tại", "Lượng mưa (mm)", "Biểu đồ mưa"}}
	allPhuongDataRaw := [][]string{{"STT", "Phường", "Đo tại", "Lượng mưa (mm)", "Biểu đồ mưa"}}
	allXaDataRaw := [][]string{{"STT", "Xã", "Đo tại", "Lượng mưa (mm)", "Biểu đồ mưa"}}

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

		// Phụ lục: Thống kê các trạm Phường và Xã có mưa (rain > 0)
		sttPhuLuc := 0
		for _, p := range phuongs {
			if p.rain <= 0 {
				continue
			}
			sttPhuLuc++
			phuong := p.rs.TenPhuong
			if phuong == "" {
				phuong = p.rs.TenTram
			}
			diaChi := p.rs.DiaChi
			if diaChi == "" {
				diaChi = "Chưa cập nhật"
			}
			bieuDoText := ""
			if sttPhuLuc == 1 {
				bieuDoText = "(Dự kiến đưa vào)"
			}
			allPhuongDataRaw = append(allPhuongDataRaw, []string{fmt.Sprintf("%d", sttPhuLuc), phuong, diaChi, fmt.Sprintf("%.1f", p.rain), bieuDoText})
		}
		sttPhuLuc = 0
		for _, x := range xas {
			if x.rain <= 0 {
				continue
			}
			sttPhuLuc++
			xa := x.rs.TenPhuong
			if xa == "" {
				xa = x.rs.TenTram
			}
			diaChi := x.rs.DiaChi
			if diaChi == "" {
				diaChi = "Chưa cập nhật"
			}
			bieuDoText := ""
			if sttPhuLuc == 1 {
				bieuDoText = "(Dự kiến đưa vào)"
			}
			allXaDataRaw = append(allXaDataRaw, []string{fmt.Sprintf("%d", sttPhuLuc), xa, diaChi, fmt.Sprintf("%.1f", x.rain), bieuDoText})
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

		for i, p := range phuongsReport {
			stt := fmt.Sprintf("%d", i+1)
			phuong := p.rs.TenPhuong
			if phuong == "" {
				phuong = p.rs.TenTram
			}
			diaChi := p.rs.DiaChi
			if diaChi == "" {
				diaChi = "Chưa cập nhật"
			}
			bieuDoText := ""
			if i == 0 {
				bieuDoText = "(Dự kiến đưa vào)"
			}
			phuongDataRaw = append(phuongDataRaw, []string{stt, phuong, diaChi, fmt.Sprintf("%.1f", p.rain), bieuDoText})
		}
		for i, x := range xasReport {
			stt := fmt.Sprintf("%d", i+1)
			xa := x.rs.TenPhuong
			if xa == "" {
				xa = x.rs.TenTram
			}
			diaChi := x.rs.DiaChi
			if diaChi == "" {
				diaChi = "Chưa cập nhật"
			}
			bieuDoText := ""
			if i == 0 {
				bieuDoText = "(Dự kiến đưa vào)"
			}
			xaDataRaw = append(xaDataRaw, []string{stt, xa, diaChi, fmt.Sprintf("%.1f", x.rain), bieuDoText})
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
