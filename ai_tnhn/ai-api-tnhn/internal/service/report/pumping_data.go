package report

import (
	"ai-api-tnhn/internal/service/google/googleapi"
	"strings"
	"time"
)

type pumpingReportData struct {
	NoiDungTramBom  string
	DanhSachTramBom string
}

func (s *service) buildPumpingReportData(city *googleapi.CityStatus) pumpingReportData {
	noiDungTramBom := "Hiện tại không ghi nhận trạm bơm nào đang vận hành."
	danhSachTramBom := "không có trạm nào vận hành"

	if city.Pumping != nil {
		if city.Pumping.SummaryPriorityText != "" {
			noiDungTramBom = city.Pumping.SummaryPriorityText
		}

		ict := time.FixedZone("ICT", 7*3600)
		now := time.Now().In(ict)
		startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, ict).Unix()

		var names []string
		for _, st := range city.Pumping.Stations {
			if st.OperatingCount > 0 || st.LastOperationTime >= startOfDay {
				names = append(names, st.Name)
			}
		}
		if len(names) > 0 {
			danhSachTramBom = strings.Join(names, ", ")
		}
	}

	return pumpingReportData{
		NoiDungTramBom:  noiDungTramBom,
		DanhSachTramBom: danhSachTramBom,
	}
}
