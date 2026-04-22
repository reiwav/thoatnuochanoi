package promt

import (
	"embed"
	"strings"
)

//go:embed *.txt
var files embed.FS

var prompts map[string]string

func init() {
	prompts = make(map[string]string)
	entries, err := files.ReadDir(".")
	if err != nil {
		return
	}

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".txt") {
			continue
		}
		content, err := files.ReadFile(entry.Name())
		if err == nil {
			// Key is filename without .txt
			key := strings.TrimSuffix(entry.Name(), ".txt")
			prompts[key] = string(content)
		}
	}
}

// Get trả về nội dung prompt dựa trên key (tên file không có đuôi .txt)
func Get(key string) string {
	return prompts[key]
}

// All trả về tất cả các prompts đang có (dành cho mục đích debug hoặc map theo yêu cầu)
func All() map[string]string {
	return prompts
}
