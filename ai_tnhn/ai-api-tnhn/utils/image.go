package utils

import (
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

// SaveBase64Image saves a base64 encoded image to the specified directory and returns the relative path.
func SaveBase64Image(base64Data string, baseDir string, subDir string) (string, error) {
	if base64Data == "" {
		return "", fmt.Errorf("empty base64 data")
	}

	// Sanitize baseDir and subDir to use forward slashes for URL compatibility later
	// but use filepath.Join for physical directory creation.

	// Remove data URI prefix if exists (e.g., "data:image/png;base64,")
	b64 := base64Data
	if i := strings.Index(base64Data, ","); i != -1 {
		b64 = base64Data[i+1:]
	}

	data, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		return "", fmt.Errorf("failed to decode base64: %v", err)
	}

	// Detect format (basic check)
	ext := ".jpg"
	if strings.Contains(base64Data, "image/png") {
		ext = ".png"
	} else if strings.Contains(base64Data, "image/webp") {
		ext = ".webp"
	} else if strings.Contains(base64Data, "image/gif") {
		ext = ".gif"
	}

	// Ensure physical directory exists
	physicalDir := filepath.Join(baseDir, subDir)
	if err := os.MkdirAll(physicalDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create directory: %v", err)
	}

	fileName := fmt.Sprintf("%d_%s%s", time.Now().Unix(), uuid.New().String()[:8], ext)
	physicalPath := filepath.Join(physicalDir, fileName)

	if err := os.WriteFile(physicalPath, data, 0644); err != nil {
		return "", fmt.Errorf("failed to write file: %v", err)
	}

	// Return relative path for URL (relative to baseDir, including subDir)
	// We use strings.ReplaceAll to ensure forward slashes in the path returned
	return strings.ReplaceAll(filepath.Join(subDir, fileName), "\\", "/"), nil
}
