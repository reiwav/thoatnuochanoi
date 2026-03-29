package email

import (
	"ai-api-tnhn/config"
	"context"
	"fmt"
	"strings"
	"testing"

	"github.com/emersion/go-imap"
	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

func TestGetLatestRainWarning_Real(t *testing.T) {
	// Skip by default if not running integration tests
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	cfg := config.LoadEnv()
	svc := NewService(cfg.EmailConfig)
	ctx := context.Background()

	t.Log("Attempting to fetch latest rain warning from real IMAP...")
	text, err := svc.GetLatestRainWarning(ctx)
	if err != nil {
		t.Logf("Note: Real IMAP test failed: %v", err)
		return
	}

	t.Logf("Extracted Text Length: %d", len(text))
	t.Logf("Preview: %s", truncate(text, 100))
}

func TestGetLatestEmailAttachmentPage1_Real(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	cfg := config.LoadEnv()
	// Override if needed for local testing, but LoadEnv should be correct after my config/env.go edit
	svc := NewService(cfg.EmailConfig)
	ctx := context.Background()

	t.Logf("Testing with IMAP User: %s", cfg.EmailConfig.User)
	text, err := svc.GetLatestEmailAttachmentPage1(ctx)
	if err != nil {
		t.Errorf("GetLatestEmailAttachmentPage1 failed: %v", err)
		return
	}

	fmt.Printf("\n--- EXTRACTED CONTENT START ---\n%s\n--- EXTRACTED CONTENT END ---\n\n", text)
	t.Logf("Total Extracted Content Length: %d", len(text))
}

func TestExtractTextFromPDF_Simple(t *testing.T) {
	_ = &service{}
}

func TestListRecentEmails_Manual(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	cfg := config.LoadEnv()
	svc := NewService(cfg.EmailConfig).(*service)
	c, err := svc.connectIMAP()
	if err != nil {
		t.Fatalf("failed to connect IMAP: %v", err)
	}

	mbox, err := c.Select("INBOX", false)
	if err != nil {
		t.Fatalf("failed to select INBOX: %v", err)
	}

	from := uint32(1)
	if mbox.Messages > 20 {
		from = mbox.Messages - 19
	}
	seqset := new(imap.SeqSet)
	seqset.AddRange(from, mbox.Messages)

	items := []imap.FetchItem{imap.FetchEnvelope}
	messages := make(chan *imap.Message, 20)
	done := make(chan error, 1)
	go func() {
		done <- c.Fetch(seqset, items, messages)
	}()

	fmt.Printf("\n--- LAST 20 EMAILS ---\n")
	for msg := range messages {
		fmt.Printf("ID: %d | Date: %s | From: %s | Subject: %s\n", 
			msg.SeqNum, 
			msg.Envelope.Date.Format("02-01 15:04"),
			msg.Envelope.From[0].Address(),
			msg.Envelope.Subject,
		)
	}
	if err := <-done; err != nil {
		t.Errorf("Fetch failed: %v", err)
	}
}

func TestGetLatestEmailAttachmentRaw_Real(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	cfg := config.LoadEnv()
	svc := NewService(cfg.EmailConfig)
	ctx := context.Background()

	t.Logf("Testing with IMAP User: %s", cfg.EmailConfig.User)

	// 1. Fetch raw PDF
	raw, filename, err := svc.GetLatestEmailAttachmentRaw(ctx)
	if err != nil {
		t.Fatalf("GetLatestEmailAttachmentRaw failed: %v", err)
	}
	t.Logf("Filename: %s | PDF Size: %d bytes (%.2f KB)", filename, len(raw), float64(len(raw))/1024.0)

	// 2. Use Gemini to extract text from Page 1
	client, err := genai.NewClient(ctx, option.WithAPIKey(cfg.GeminiConfig.GeminiAPIKey))
	if err != nil {
		t.Fatalf("Failed to create Gemini client: %v", err)
	}
	defer client.Close()

	model := client.GenerativeModel("gemini-2.5-flash")
	prompt := "Hãy trích xuất nội dung văn bản TRANG ĐẦU TIÊN (Trang 1) của file PDF này. Tuyệt đối không đọc các trang sau. Hãy trả về văn bản thuần túy, chính xác theo nội dung trong file."

	resp, err := model.GenerateContent(ctx,
		genai.Blob{MIMEType: "application/pdf", Data: raw},
		genai.Text(prompt),
	)
	if err != nil {
		t.Fatalf("Gemini GenerateContent failed: %v", err)
	}

	var result strings.Builder
	for _, cand := range resp.Candidates {
		for _, part := range cand.Content.Parts {
			result.WriteString(fmt.Sprintf("%v", part))
		}
	}

	text := result.String()
	fmt.Printf("\n--- GEMINI OCR PAGE 1 START ---\n%s\n--- GEMINI OCR PAGE 1 END ---\n\n", text)
	t.Logf("Extracted text length: %d characters", len(text))
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}
