package emergency_construction

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/xuri/excelize/v2"
)

// ExtractDriveFileID extracts the Google Drive file ID from various link formats.
func ExtractDriveFileID(link string) string {
	link = strings.TrimSpace(link)
	if link == "" {
		return ""
	}

	// Pattern 1: https://drive.google.com/file/d/FILE_ID/view...
	re1 := regexp.MustCompile(`/file/d/([a-zA-Z0-9_-]+)`)
	matches := re1.FindStringSubmatch(link)
	if len(matches) > 1 {
		return matches[1]
	}

	// Pattern 2: https://drive.google.com/open?id=FILE_ID
	re2 := regexp.MustCompile(`[?&]id=([a-zA-Z0-9_-]+)`)
	matches = re2.FindStringSubmatch(link)
	if len(matches) > 1 {
		return matches[1]
	}

	// Pattern 3: https://lh3.googleusercontent.com/d/FILE_ID...
	re3 := regexp.MustCompile(`/d/([a-zA-Z0-9_-]+)`)
	matches = re3.FindStringSubmatch(link)
	if len(matches) > 1 {
		return matches[1]
	}

	// Pattern 4: direct ID
	if !strings.Contains(link, "/") && len(link) >= 20 {
		return link
	}

	return ""
}

// CreateExcelWithImage is a standalone function to create an Excel file with an embedded image.
func CreateExcelWithImage(imgData []byte, fileID string, sourceLink string) (string, error) {
	if len(imgData) == 0 {
		return "", fmt.Errorf("image data is empty")
	}

	// 1. Create New Excel
	f := excelize.NewFile()
	sheetName := "TestImage"
	f.SetSheetName("Sheet1", sheetName)

	f.SetCellValue(sheetName, "A1", "Google Drive Image Import Test")
	f.SetCellValue(sheetName, "A2", fmt.Sprintf("Source Link: %s", sourceLink))
	f.SetCellValue(sheetName, "A3", fmt.Sprintf("File ID: %s", fileID))

	// 2. Insert Image
	ext := ".jpg"
	if len(imgData) > 4 && string(imgData[1:4]) == "PNG" {
		ext = ".png"
	} else if len(imgData) > 4 && string(imgData[0:3]) == "\xff\xd8\xff" {
		ext = ".jpg"
	}

	err := f.AddPictureFromBytes(sheetName, "B5", &excelize.Picture{
		Extension: ext,
		File:      imgData,
		Format: &excelize.GraphicOptions{
			ScaleX:  0.2,
			ScaleY:  0.2,
			OffsetX: 5,
			OffsetY: 5,
		},
	})
	if err != nil {
		return "", fmt.Errorf("failed to add picture to excel: %w", err)
	}

	// 3. Save locally
	outputDir := "uploads"
	if _, err := os.Stat(outputDir); os.IsNotExist(err) {
		_ = os.MkdirAll(outputDir, 0755)
	}

	fileName := fmt.Sprintf("test_import_%s.xlsx", fileID)
	outputPath := filepath.Join(outputDir, fileName)

	if err := f.SaveAs(outputPath); err != nil {
		return "", fmt.Errorf("failed to save excel file locally: %w", err)
	}

	return outputPath, nil
}
