package weather

import (
	"context"
)

func (s *service) GetRawWaterData(ctx context.Context) (*WaterDataResponse, error) {
	return s.thoatnuocSvc.GetRawWaterData(ctx)
}
