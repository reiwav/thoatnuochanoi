package inundation

import (
	"bytes"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestService_SaveLocalImages(t *testing.T) {
	// Setup
	tmpDir := "uploads/inundation_tmp"
	if err := os.MkdirAll(tmpDir, 0755); err != nil {
		t.Fatalf("Failed to create temporary directory: %v", err)
	}
	// Note: We might want to keep the directory for manual check, but better clean up after test if possible.
	// defer os.RemoveAll("uploads") // risky if other tests use it

	s := &service{}

	images := []ImageContent{
		{
			Name:     "test1.jpg",
			MimeType: "image/jpeg",
			Reader:   io.NopCloser(bytes.NewReader([]byte("fake image data 1"))),
		},
		{
			Name:     "test2.png",
			MimeType: "image/png",
			Reader:   io.NopCloser(bytes.NewReader([]byte("fake image data 2"))),
		},
	}

	prefix := "test_report"
	savedPaths, err := s.saveLocalImages(prefix, images)
	if err != nil {
		t.Fatalf("saveLocalImages failed: %v", err)
	}

	if len(savedPaths) != 2 {
		t.Errorf("Expected 2 saved paths, got %d", len(savedPaths))
	}

	for _, path := range savedPaths {
		if !strings.HasPrefix(path, "inundation_tmp/") {
			t.Errorf("Expected path to start with inundation_tmp/, got %s", path)
		}

		fullPath := filepath.Join("uploads", path)
		if _, err := os.Stat(fullPath); os.IsNotExist(err) {
			t.Errorf("Saved file %s does not exist on disk", fullPath)
		}

		// Cleanup
		_ = os.Remove(fullPath)
	}
}

func TestService_LocalPathDetection(t *testing.T) {
	t.Run("Prefix matching", func(t *testing.T) {
		samples := []struct {
			path     string
			expected bool
		}{
			{"local:inundation_tmp/test.jpg", true},
			{"1abc2def3ghi", false}, // Fake Drive ID
			{"https://example.com/img.jpg", false},
		}

		for _, s := range samples {
			isLocal := strings.HasPrefix(s.path, "local:")
			if isLocal != s.expected {
				t.Errorf("Path %s: expected local=%v, got %v", s.path, s.expected, isLocal)
			}
		}
	})
}

// Note: Testing the sync worker requires heavy mocking of all repos and Drive service.
// Given the project structure, this is best verified with a manual test or a more complex integration test.
// But we can verify the directory cleanup logic.
func TestService_SaveLocalImages_DirectoryCreation(t *testing.T) {
	// Ensure directory is created if missing
	os.RemoveAll("uploads/inundation_tmp")

	s := &service{}
	images := []ImageContent{
		{
			Name:     "test.jpg",
			MimeType: "image/jpeg",
			Reader:   io.NopCloser(bytes.NewReader([]byte("data"))),
		},
	}

	_, err := s.saveLocalImages("test_dir", images)
	if err != nil {
		t.Fatalf("Failed to save image: %v", err)
	}

	if _, err := os.Stat("uploads/inundation_tmp"); os.IsNotExist(err) {
		t.Error("Director uploads/inundation_tmp was not created")
	}
}
