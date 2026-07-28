package middleware

import (
	"ai-api-tnhn/internal/constant"
	"ai-api-tnhn/utils/web"
	"crypto"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// RSAPublicAuthMiddleware verifies third-party requests using RSA signatures
func (m *mid) RSAPublicAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		appID := c.GetHeader("X-App-Id")
		timestampStr := c.GetHeader("X-Timestamp")
		signature := c.GetHeader("X-Signature")

		if appID == "" || timestampStr == "" || signature == "" {
			m.SendError(c, web.Unauthorized("Thiếu thông tin xác thực (X-App-Id, X-Timestamp, X-Signature)"))
			c.Abort()
			return
		}

		// Check timestamp (prevent replay attack, +/- 5 mins)
		ts, err := strconv.ParseInt(timestampStr, 10, 64)
		if err != nil {
			m.SendError(c, web.Unauthorized("X-Timestamp không hợp lệ"))
			c.Abort()
			return
		}
		reqTime := time.Unix(ts, 0)
		now := time.Now()
		if reqTime.Before(now.Add(-5*time.Minute)) || reqTime.After(now.Add(5*time.Minute)) {
			m.SendError(c, web.Unauthorized("Request quá hạn (Timestamp không hợp lệ)"))
			c.Abort()
			return
		}

		// Find Client Key
		clientInfo, exists := constant.PublicClients[appID]
		if !exists {
			m.SendError(c, web.Unauthorized("App ID không tồn tại"))
			c.Abort()
			return
		}

		// Construct payload to verify: AppID + Timestamp + URL Path
		payload := appID + timestampStr + c.Request.URL.Path

		// Verify signature
		if !verifyRSASignature(clientInfo.PublicKey, payload, signature) {
			m.SendError(c, web.Unauthorized("Chữ ký không hợp lệ"))
			c.Abort()
			return
		}

		// Pass client info to context if needed
		c.Set("public_app_id", appID)
		c.Next()
	}
}

func verifyRSASignature(pubKeyStr, data, signatureBase64 string) bool {
	pubKeyBlock, _ := pem.Decode([]byte(pubKeyStr))
	if pubKeyBlock == nil {
		return false
	}

	pub, err := x509.ParsePKIXPublicKey(pubKeyBlock.Bytes)
	if err != nil {
		return false
	}

	rsaPub, ok := pub.(*rsa.PublicKey)
	if !ok {
		return false
	}

	sigBytes, err := base64.StdEncoding.DecodeString(signatureBase64)
	if err != nil {
		return false
	}

	hashed := sha256.Sum256([]byte(data))
	err = rsa.VerifyPKCS1v15(rsaPub, crypto.SHA256, hashed[:], sigBytes)
	return err == nil
}

// rateLimiters maps AppID to rate limiter
var (
	rateLimiters = make(map[string]*rate.Limiter)
	mu           sync.Mutex
)

func getLimiter(appID string) *rate.Limiter {
	mu.Lock()
	defer mu.Unlock()

	limiter, exists := rateLimiters[appID]
	if !exists {
		// 100 requests per minute = ~1.66 requests per second, burst 50
		limiter = rate.NewLimiter(rate.Every(time.Minute/100), 50)
		rateLimiters[appID] = limiter
	}
	return limiter
}

// RateLimitMiddleware limits requests per AppID
func (m *mid) RateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		appID := c.GetString("public_app_id")
		if appID == "" {
			appID = c.ClientIP() // fallback to IP if not authenticated yet, though this should run after auth
		}

		limiter := getLimiter(appID)
		if !limiter.Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"code":    http.StatusTooManyRequests,
				"message": "Too Many Requests",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}
