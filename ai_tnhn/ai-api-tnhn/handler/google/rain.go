package google

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/google/googleapi"
	"ai-api-tnhn/internal/service/weather"
	"ai-api-tnhn/utils/web"
	"encoding/json"
	"fmt"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
)

// GetRainSummary godoc
// @Summary Lấy tóm tắt lượng mưa cho AI
// @Description Truy xuất dữ liệu tóm tắt lượng mưa có cấu trúc để AI xử lý hoặc hiển thị
// @Tags AI & Giám sát
// @Produce json
// @Security BearerAuth
// @Param is_chat query bool false "Có lưu hành động vào lịch sử chat không"
// @Success 200 {object} web.Response{data=object}
// @Router /admin/google/rain-summary [get]
func (h *handler) GetRainSummary(c *gin.Context) {
	token := h.contextWith.GetTokenFromContext(c)
	orgID := token.OrgID
	if token.IsCompany {
		orgID = ""
	}
	summary, err := h.googleSvc.GetRainSummary(c.Request.Context(), orgID, nil)
	web.AssertNil(err)

	isChat := c.Query("is_chat") == "true"
	if isChat && h.aiChatLogRepo != nil && token.UserID != "" {
		now := time.Now()
		// Save User Query
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: token.UserID, Role: "user", Content: "Tình hình mưa đang như thế nào?", ChatType: "support", Timestamp: now.Add(-1 * time.Second),
		})

		// Format AI Response to match Frontend display
		displayText := h.formatRainSummaryText(summary)

		// Save AI Response
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: token.UserID, Role: "model", Content: displayText, ChatType: "support", Timestamp: now,
		})
	}

	h.SendData(c, summary)
}

// rainSummaryResponse is the structured response for rain-summary-text
type rainSummaryResponse struct {
	Text   string                 `json:"text"`
	Tables map[string]interface{} `json:"tables"`
}

// GetRainSummaryText godoc
// @Summary Lấy tóm tắt lượng mưa (dạng văn bản + bảng)
// @Description Truy xuất bản tóm tắt về tình hình mưa hiện tại kèm dữ liệu bảng có cấu trúc
// @Tags AI & Giám sát
// @Produce json
// @Security BearerAuth
// @Success 200 {object} web.Response{data=rainSummaryResponse}
// @Router /admin/google/rain-summary-text [get]
func (h *handler) GetRainSummaryText(c *gin.Context) {
	token := h.contextWith.GetTokenFromContext(c)
	orgID := token.OrgID
	if token.IsCompany {
		orgID = ""
	}
	summary, err := h.googleSvc.GetRainSummary(c.Request.Context(), orgID, nil)
	web.AssertNil(err)

	// Build header text (no markdown table)
	headerText := h.formatRainSummaryHeader(summary)

	// Build structured rain table rows (same format as main chat)
	rainRows := h.buildRainTableRows(summary)

	// Compose text with [TABLE:rains] tag for frontend to replace
	displayText := headerText + "\n[TABLE:rains]"
	tables := map[string]interface{}{
		"rains": rainRows,
	}

	response := rainSummaryResponse{
		Text:   displayText,
		Tables: tables,
	}

	// Persist to chat history as JSON (so history reload also renders tables)
	if h.aiChatLogRepo != nil && token.UserID != "" {
		now := time.Now()
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: token.UserID, Role: "user", Content: "Tình hình mưa đang như thế nào?", ChatType: "support", Timestamp: now.Add(-1 * time.Second),
		})
		contentJSON, _ := json.Marshal(response)
		_ = h.aiChatLogRepo.Save(c.Request.Context(), &models.AiChatLog{
			UserID: token.UserID, Role: "model", Content: string(contentJSON), ChatType: "support", Timestamp: now,
		})
	}

	h.SendData(c, response)
}

// formatRainSummaryHeader returns only the header summary text (no markdown table)
func (h *handler) formatRainSummaryHeader(summary *weather.RainSummaryData) string {
	if len(summary.Measurements) == 0 {
		return "Hiện tại không mưa."
	}

	statusLine := "- Hiện tại không còn mưa"
	if summary.RainyStations > 0 {
		statusLine = fmt.Sprintf("- Số trạm đang có mưa: %d", summary.RainyStations)
	}

	return fmt.Sprintf("### Tình hình mưa hiện tại:\n- Tổng số trạm: %d\n%s\n- Trạm mưa lớn nhất trong ngày: **%s** (%.1fmm)",
		summary.TotalStations, statusLine, summary.MaxRainStation.Name, summary.MaxRainStation.TotalRain)
}

// buildRainTableRows converts summary measurements to structured RainTableRow slice
func (h *handler) buildRainTableRows(summary *weather.RainSummaryData) []googleapi.RainTableRow {
	var rows []googleapi.RainTableRow
	for i, m := range summary.Measurements {
		statusStr := "✅ Đã tạnh"
		if m.IsRaining {
			statusStr = "🌧️ Đang mưa"
		}
		timeStr := ""
		if m.StartTime != "" && m.EndTime != "" {
			timeStr = fmt.Sprintf("%s - %s", m.StartTime, m.EndTime)
		} else if m.EndTime != "" {
			timeStr = m.EndTime
		}
		rows = append(rows, googleapi.RainTableRow{
			STT:       i + 1,
			Tram:      m.Name,
			DiaChi:    m.Address,
			LuongMua:  fmt.Sprintf("%.1fmm", m.TotalRain),
			ThoiGian:  timeStr,
			TrangThai: statusStr,
			Type:      m.Type,
			Priority:  m.Priority,
			TotalRain: m.TotalRain,
		})
	}
	return rows
}

// formatRainSummaryText returns the full markdown text (for legacy/non-table usage)
func (h *handler) formatRainSummaryText(summary *weather.RainSummaryData) string {
	if len(summary.Measurements) == 0 {
		return "Hiện tại không mưa."
	}

	header := h.formatRainSummaryHeader(summary)

	var phuongList, xaList []weather.RainStationStat
	for _, m := range summary.Measurements {
		if m.Type == "xa" {
			xaList = append(xaList, m)
		} else {
			phuongList = append(phuongList, m)
		}
	}

	sort.Slice(phuongList, func(i, j int) bool {
		return phuongList[i].TotalRain > phuongList[j].TotalRain
	})

	sort.Slice(xaList, func(i, j int) bool {
		if xaList[i].Priority != xaList[j].Priority {
			return xaList[i].Priority > xaList[j].Priority
		}
		return xaList[i].TotalRain > xaList[j].TotalRain
	})

	renderTable := func(title string, list []weather.RainStationStat) string {
		if len(list) == 0 {
			return ""
		}
		res := fmt.Sprintf("\n**%s**\n\n| STT | Trạm | Địa chỉ | Lượng mưa | Thời gian | Trạng thái |\n| :--- | :--- | :--- | :---: | :---: | :---: |\n", title)
		for i, m := range list {
			statusIcon := "🌧️"
			statusText := "Đang mưa"
			if !m.IsRaining {
				statusIcon = "✅"
				statusText = "Đã tạnh"
			}
			res += fmt.Sprintf("| %d | %s | %s | %.1fmm | %s - %s | %s %s |\n",
				i+1, m.Name, m.Address, m.TotalRain, m.StartTime, m.EndTime, statusIcon, statusText)
		}
		return res
	}

	return header + "\n" + renderTable("Khu vực Phường (Nội thành)", phuongList) + renderTable("Khu vực Xã (Ngoại thành)", xaList)
}
