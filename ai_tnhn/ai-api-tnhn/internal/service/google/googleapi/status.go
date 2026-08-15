package googleapi

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/utils/number"
	"context"
	"fmt"
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
			case int32:
				totalTokens = int64(v)
			case int64:
				totalTokens = v
			case float64:
				totalTokens = int64(v)
			}
		}

		var reqCount int64
		if val, ok := aiStats["request_count"]; ok {
			switch v := val.(type) {
			case int32:
				reqCount = int64(v)
			case int64:
				reqCount = v
			case float64:
				reqCount = int64(v)
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

	// 1. Lấy ID của email thời tiết mới nhất theo bộ lọc của bạn
	emailID, err := s.emailSvc.GetLatestWeatherEmailID(ctx)
	if err != nil || emailID == 0 {
		return ""
	}

	// 2. Kiểm tra cache
	s.cacheMu.RLock()
	if emailID <= s.cachedEmailID && s.cachedOCRText != "" {
		text := s.cachedOCRText
		s.cacheMu.RUnlock()
		return text
	}
	s.cacheMu.RUnlock()

	// Khóa quá trình fetch OCR để tránh việc nhiều goroutine cùng fetch
	s.ocrFetchMu.Lock()
	defer s.ocrFetchMu.Unlock()

	// Double-check cache sau khi có lock
	s.cacheMu.RLock()
	if emailID <= s.cachedEmailID && s.cachedOCRText != "" {
		text := s.cachedOCRText
		s.cacheMu.RUnlock()
		return text
	}
	s.cacheMu.RUnlock()

	// 3. Nếu chưa có trong cache hoặc có email mới, tải file và OCR bằng Gemini
	raw, _, err := s.emailSvc.GetEmailAttachmentRawByID(ctx, emailID)
	if err != nil || len(raw) == 0 {
		return ""
	}

	ocrText, geminiErr := s.geminiSvc.ExtractTextFromPDF(ctx, raw)
	if geminiErr != nil || ocrText == "" {
		return ""
	}

	// 4. Cập nhật cache
	s.cacheMu.Lock()
	s.cachedEmailID = emailID
	s.cachedOCRText = ocrText
	s.cacheMu.Unlock()

	// 5. Lưu vào Database
	if s.ocrEmailRepo != nil {
		record := &models.OCREmailRecord{
			EmailID: emailID,
			OCRText: ocrText,
		}
		_ = s.ocrEmailRepo.Save(ctx, record)
	}

	fmt.Printf("time=\"%s\" level=info msg=\"DynamicReport: OCR OK, %d chars, cached with Email ID %d\"\n",
		time.Now().Format("2006-01-02 15:04:05"), len(ocrText), emailID)

	return ocrText
}

func (s *service) GetCityStatus(ctx context.Context) (*CityStatus, error) {
	return s.GetCityStatusForUser(ctx, "", nil, nil, nil, nil)
}

func (s *service) GetCityStatusForUser(ctx context.Context, orgID string, assignedRain, assignedLake, assignedRiver, assignedInu []string) (*CityStatus, error) {
	var res = &CityStatus{}
	var mu sync.Mutex

	// Set a reasonable timeout for the entire status retrieval to prevent dashboard hanging
	ctx, cancel := context.WithTimeout(ctx, 120*time.Second)
	defer cancel()

	g, gCtx := errgroup.WithContext(ctx)

	g.Go(func() error {
		weatherSum, _ := s.weatherSvc.GetRainSummary(gCtx, orgID, assignedRain)
		mu.Lock()
		res.Weather = weatherSum
		mu.Unlock()
		return nil
	})
	g.Go(func() error {
		waterSum, _ := s.waterSvc.GetWaterSummary(gCtx, orgID, append(assignedLake, assignedRiver...))
		mu.Lock()
		res.Water = waterSum
		mu.Unlock()
		return nil
	})
	g.Go(func() error {
		inuSum, _ := s.inuSvc.GetInundationSummary(gCtx, orgID, true, assignedInu)
		mu.Lock()
		res.Inundation = inuSum
		mu.Unlock()
		return nil
	})
	g.Go(func() error {
		pumpingSum, _ := s.pumpingSvc.GetPumpingStationSummary(gCtx, orgID, nil)
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
	g.Go(func() error {
		if s.wastewaterSvc != nil {
			ww, _ := s.wastewaterSvc.ListFiltered(gCtx, orgID, nil)
			mu.Lock()
			res.Wastewater = ww
			mu.Unlock()
		}
		return nil
	})

	_ = g.Wait()
	return res, nil
}
