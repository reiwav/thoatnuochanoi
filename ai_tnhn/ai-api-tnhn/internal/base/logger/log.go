package logger

import (
	"ai-api-tnhn/config"
	"io"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

type Logger interface {
	GinRecovery() gin.HandlerFunc
	GinLogger() gin.HandlerFunc
	GetLogger() *logrus.Logger
}

type log struct {
	MaxBodyLogSize int //= 8 * 1024 // 8KB
	Logger         *logrus.Logger
}

func NewLogger(cfg config.LoggerConfig) Logger {
	l := logrus.New()

	// tạo thư mục log nếu chưa có
	_ = os.MkdirAll(cfg.LogDir, 0755)

	file, err := os.OpenFile(
		filepath.Join(cfg.LogDir, cfg.LogFile),
		os.O_CREATE|os.O_WRONLY|os.O_APPEND,
		0644,
	)
	if err != nil {
		panic(err)
	}

	// ghi ra cả stdout + file
	l.SetOutput(io.MultiWriter(os.Stdout, file))

	l.SetLevel(logrus.DebugLevel)
	l.SetFormatter(&logrus.TextFormatter{
		FullTimestamp:   true,
		TimestampFormat: "2006-01-02 15:04:05",
	})

	return log{
		MaxBodyLogSize: 8 * 1024,
		Logger:         l,
	}
}

func (l log) GetLogger() *logrus.Logger {
	return l.Logger
}
