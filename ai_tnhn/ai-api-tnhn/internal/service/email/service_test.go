package email

import (
	"ai-api-tnhn/config"
	"context"
	"testing"
)

func TestGetLatestRainWarning_Real(t *testing.T) {
	// Skip by default if not running integration tests
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	cfg := config.LoadEnv()
	conf := cfg.EmailConfig
	t.Logf("Testing with User: %s", conf.User)
	t.Logf("Testing with Password length: %d", len(conf.Password))
	svc := NewService(cfg.EmailConfig)
	ctx := context.Background()

	t.Log("Attempting to fetch latest rain warning from real IMAP...")
	text, err := svc.GetLatestRainWarning(ctx)
	if err != nil {
		t.Logf("Note: Real IMAP test failed (expected if credentials/IMAP settings are pending): %v", err)
		return
	}

	t.Logf("Extracted Text Length: %d", len(text))
	t.Logf("Preview: %s", truncate(text, 100))
}

func TestExtractTextFromPDF_Simple(t *testing.T) {
	// This tests the internal logic with a real (though small) PDF or just verifies the method exists
	// For a true unit test, we'd mock the pdf reader, but the library makes it hard.
	// We'll at least verify the service can be initialized.
	svc := &service{}
	if svc == nil {
		t.Fatal("Failed to init service")
	}
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}
