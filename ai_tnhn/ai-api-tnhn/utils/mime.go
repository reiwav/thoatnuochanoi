package utils

import (
	"mime"
	"path/filepath"
	"strings"
)

var customMimeTypes = map[string]string{
	".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	".xls":  "application/vnd.ms-excel",
	".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	".doc":  "application/msword",
	".pdf":  "application/pdf",
	".png":  "image/png",
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
	".gif":  "image/gif",
	".svg":  "image/svg+xml",
	".txt":  "text/plain",
	".zip":  "application/zip",
	".rar":  "application/x-rar-compressed",
	".7z":   "application/x-7z-compressed",
	".mp3":  "audio/mpeg",
	".mp4":  "video/mp4",
	".csv":  "text/csv",
}

// GetMimeType returns a robust MIME type for a given filename based on its extension.
// It prioritizes a built-in map of common extensions to bypass potential missing
// MIME databases on the host system, falling back to mime.TypeByExtension.
func GetMimeType(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	if mimeType, exists := customMimeTypes[ext]; exists {
		return mimeType
	}
	
	mimeType := mime.TypeByExtension(ext)
	if mimeType != "" {
		// Strip parameters if any, e.g., "text/plain; charset=utf-8" -> "text/plain"
		if parts := strings.Split(mimeType, ";"); len(parts) > 0 {
			return strings.TrimSpace(parts[0])
		}
		return mimeType
	}
	
	return "application/octet-stream"
}
