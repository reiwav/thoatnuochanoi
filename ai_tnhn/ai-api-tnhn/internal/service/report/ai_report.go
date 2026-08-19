package report

import (
	"ai-api-tnhn/internal/constant"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/google/googleapi"
	"context"
	"encoding/json"
	"strings"
	"time"
)

func (s *service) GenerateQuickReportText(ctx context.Context, userID string) (*googleapi.ChatResponse, error) {
	res, err := s.googleSvc.GenerateAIReport(ctx, constant.ReportTypeViber, userID)
	if err != nil {
		return nil, err
	}
	s.saveChatLog(userID, "Lấy báo cáo nhanh tình hình (Văn bản)", res, "support")
	return res, nil
}

func (s *service) GenerateAIDynamicReport(ctx context.Context, userID string) (*googleapi.ChatResponse, error) {
	res, err := s.googleSvc.GenerateAIReport(ctx, constant.ReportTypeDynamic, userID)
	if err != nil {
		return nil, err
	}
	s.saveChatLog(userID, "Lấy báo cáo nhanh tình hình", res, "support")
	return res, nil
}

func (s *service) saveChatLog(userID, userMsg string, res *googleapi.ChatResponse, chatType string) {
	if s.aiChatLogRepo == nil || userID == "" || res == nil {
		return
	}
	go func() {
		now := time.Now()
		ctx := context.Background()
		_ = s.aiChatLogRepo.Save(ctx, &models.AiChatLog{
			UserID: userID, Role: "user", Content: userMsg,
			ChatType: chatType, Timestamp: now.Add(-1 * time.Second),
		})
		resBytes, _ := json.Marshal(res)
		_ = s.aiChatLogRepo.Save(ctx, &models.AiChatLog{
			UserID: userID, Role: "model", Content: string(resBytes),
			ChatType: chatType, Timestamp: now,
		})
	}()
}

// parseAIReportSummary extracts and falls back to city status if AI JSON is incomplete
func (s *service) parseAIReportSummary(ctx context.Context, userID string, city *googleapi.CityStatus) (noidung, motaUngNgap, chiTietCacDiem, noiDungTramBom string) {
	noidung = "Báo cáo tình hình mưa"
	motaUngNgap = "không xuất hiện điểm úng ngập"
	chiTietCacDiem = ""
	noiDungTramBom = "Hiện tại không ghi nhận trạm bơm nào đang vận hành."

	chatRes, _ := s.googleSvc.GenerateAIReport(ctx, constant.ReportTypeFullWord, userID)
	if chatRes != nil && chatRes.Text != "" {
		cleanJSON := chatRes.Text
		if strings.Contains(cleanJSON, "```") {
			parts := strings.Split(cleanJSON, "```")
			for _, p := range parts {
				p = strings.TrimSpace(p)
				if strings.HasPrefix(p, "json") {
					cleanJSON = strings.TrimPrefix(p, "json")
					break
				} else if strings.HasPrefix(p, "{") {
					cleanJSON = p
					break
				}
			}
		}

		var aiData struct {
			RainSummary string `json:"rain_summary"`
			InuSummary  string `json:"inu_summary"`
			InuDetails  string `json:"inu_details"`
			PumpSummary string `json:"pump_summary"`
		}
		err := json.Unmarshal([]byte(cleanJSON), &aiData)
		if err == nil {
			if aiData.RainSummary != "" {
				noidung = strings.TrimSpace(aiData.RainSummary)
			}
			if aiData.InuSummary != "" {
				motaUngNgap = strings.TrimSpace(aiData.InuSummary)
			}
			if aiData.InuDetails != "" {
				chiTietCacDiem = strings.TrimSpace(aiData.InuDetails)
			}
			if aiData.PumpSummary != "" {
				noiDungTramBom = strings.TrimSpace(aiData.PumpSummary)
			}

			// Fallback: If AI returned empty details or "no points" but we actually have active points
			if (chiTietCacDiem == "" || strings.Contains(chiTietCacDiem, "Không có") || strings.Contains(chiTietCacDiem, "không có")) &&
				city.Inundation != nil && city.Inundation.ActivePoints > 0 {
				chiTietCacDiem = city.Inundation.FullSummary
			}

			// Fallback for rain summary
			if (noidung == "" || len(noidung) < 10) && city.Weather != nil {
				noidung = city.Weather.SummaryText
			}

			// Fallback for inu summary
			if (motaUngNgap == "" || len(motaUngNgap) < 5) && city.Inundation != nil {
				motaUngNgap = city.Inundation.SummaryText
			}
		} else {
			// Fallback if AI didn't return valid JSON
			if chatRes.Text != "" {
				noidung = chatRes.Text
			}
			if city.Inundation != nil {
				motaUngNgap = city.Inundation.SummaryText
				chiTietCacDiem = city.Inundation.FullSummary
			}
		}
	} else {
		// Fallback if AI fails completely
		if city.Inundation != nil {
			motaUngNgap = city.Inundation.SummaryText
			chiTietCacDiem = city.Inundation.FullSummary
		}
		if city.Weather != nil {
			noidung = city.Weather.SummaryText
		}
	}
	return
}
