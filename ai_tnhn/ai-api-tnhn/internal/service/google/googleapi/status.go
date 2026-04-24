package googleapi

import (
	"ai-api-tnhn/internal/service/email"
	"ai-api-tnhn/utils/number"
	"context"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"golang.org/x/sync/errgroup"
)

func (s *service) GetStatus(ctx context.Context) (*GoogleStatus, error) {
	status := &GoogleStatus{}

	if s.emailSvc != nil {
		count, err := s.emailSvc.GetUnreadCount(ctx)
		if err == nil {
			status.UnreadEmails = int64(count)
			status.UnreadEmailsStr = number.Format(int64(count))

			if count > 0 {
				list, err := s.emailSvc.GetRecentEmails(ctx, 20)
				if err == nil {
					status.UnreadEmailsList = list
				}
			}
		}
	}

	about, err := s.driveSvc.About.Get().Fields("storageQuota").Do()
	if err == nil && about.StorageQuota != nil {
		status.DriveQuota = DriveQuota{
			Limit:        about.StorageQuota.Limit,
			LimitStr:     number.Format(about.StorageQuota.Limit),
			Usage:        about.StorageQuota.Usage,
			UsageStr:     number.Format(about.StorageQuota.Usage),
			UsageInDrive: about.StorageQuota.UsageInDrive,
		}
	}

	aiStats, err := s.aiUsageRepo.GetAggregateStats(ctx, bson.M{})
	if err == nil {
		var totalTokens int64
		if val, ok := aiStats["total_tokens"]; ok {
			switch v := val.(type) {
			case int32: totalTokens = int64(v)
			case int64: totalTokens = v
			case float64: totalTokens = int64(v)
			}
		}

		var reqCount int64
		if val, ok := aiStats["request_count"]; ok {
			switch v := val.(type) {
			case int32: reqCount = int64(v)
			case int64: reqCount = v
			case float64: reqCount = int64(v)
			}
		}

		status.AiUsage = AiUsageStats{
			TotalTokens:     totalTokens,
			TotalTokensStr:  number.Format(totalTokens),
			RequestCount:    reqCount,
			RequestCountStr: number.Format(reqCount),
			TotalCostUSD:    float64(totalTokens) * 0.00000015,
			TotalCostUSDStr: number.FormatDecimal(float64(totalTokens)*0.00000015, 6),
		}
	}

	return status, nil
}

func (s *service) GetLatestOCRText(ctx context.Context) string {
	if s.emailSvc == nil || s.geminiSvc == nil {
		return ""
	}
	cacheKey := "latest_ocr_text"
	if cached, ok := s.cache.Load(cacheKey); ok {
		if detail, ok := cached.(*email.EmailDetail); ok {
			if time.Since(time.Unix(detail.Timestamp, 0)) < 2*time.Hour {
				return detail.Body
			}
		}
	}

	emailDetail, err := s.ReadEmailByTitle(ctx, "Dự báo thời tiết")
	if err != nil || emailDetail == nil || len(emailDetail.Attachments) == 0 {
		return ""
	}

	att := emailDetail.Attachments[0]
	raw, err := s.emailSvc.DownloadAttachment(ctx, emailDetail.ID, att.ID)
	if err != nil {
		return ""
	}

	ocrText, geminiErr := s.geminiSvc.ExtractTextFromPDF(ctx, raw)
	if geminiErr != nil {
		return ""
	}

	emailDetail.Body = ocrText
	s.cache.Store(cacheKey, emailDetail)
	return ocrText
}

func (s *service) GetCityStatus(ctx context.Context) (*CityStatus, error) {
	var res CityStatus
	var mu sync.Mutex
	g, gCtx := errgroup.WithContext(ctx)

	g.Go(func() error {
		weatherSum, _ := s.weatherSvc.GetRainSummary(gCtx, "", nil)
		mu.Lock()
		res.Weather = weatherSum
		mu.Unlock()
		return nil
	})
	g.Go(func() error {
		waterSum, _ := s.waterSvc.GetWaterSummary(gCtx, "", nil)
		mu.Lock()
		res.Water = waterSum
		mu.Unlock()
		return nil
	})
	g.Go(func() error {
		inuSum, _ := s.inuSvc.GetInundationSummary(gCtx, "", true, nil)
		mu.Lock()
		res.Inundation = inuSum
		mu.Unlock()
		return nil
	})
	g.Go(func() error {
		pumpingSum, _ := s.pumpingSvc.GetPumpingStationSummary(gCtx, "", nil)
		mu.Lock()
		res.Pumping = pumpingSum
		mu.Unlock()
		return nil
	})
	g.Go(func() error {
		ocr := s.GetLatestOCRText(gCtx)
		mu.Lock()
		res.OCRText = ocr
		mu.Unlock()
		return nil
	})
	g.Go(func() error {
		rawWater, _ := s.weatherSvc.GetRawWaterData(gCtx)
		mu.Lock()
		res.RawWater = rawWater
		mu.Unlock()
		return nil
	})

	_ = g.Wait()
	return &res, nil
}
