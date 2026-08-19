package middleware

import (
	"ai-api-tnhn/internal/constant"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestRSAVerificationWithCustomerKeys(t *testing.T) {
	pubKeyBytes, err := os.ReadFile("../../logs/hsdc-key-2026-08-18.public.pem")
	if err != nil {
		t.Fatalf("Failed to read public key: %v", err)
	}
	pubKeyStr := string(pubKeyBytes)

	privKeyBytes, err := os.ReadFile("../../logs/hsdc-key-2026-08-18.private.pem")
	if err != nil {
		t.Fatalf("Failed to read private key: %v", err)
	}

	block, _ := pem.Decode(privKeyBytes)
	if block == nil {
		t.Fatalf("Failed to decode private key PEM")
	}

	privKey, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		t.Fatalf("Failed to parse PKCS1 private key: %v", err)
	}

	appID := "hsdc-api-2026"
	timestampStr := "1787125996"
	path := "/api/public/v1/stations"
	payload := appID + timestampStr + path

	hashed := sha256.Sum256([]byte(payload))
	sig, err := rsa.SignPKCS1v15(rand.Reader, privKey, crypto.SHA256, hashed[:])
	if err != nil {
		t.Fatalf("Failed to sign payload: %v", err)
	}
	sigBase64 := base64.StdEncoding.EncodeToString(sig)

	// Test with verifyRSASignature
	isValid := verifyRSASignature(pubKeyStr, payload, sigBase64)
	if !isValid {
		t.Errorf("Signature verification failed with customer keys!")
	} else {
		t.Logf("Signature verification SUCCESSFUL!")
	}

	// Also verify that constant.PublicClients[appID] has this exact public key
	clientInfo, exists := constant.PublicClients[appID]
	if !exists {
		t.Errorf("AppID %s not found in PublicClients", appID)
	} else {
		isValidConst := verifyRSASignature(clientInfo.PublicKey, payload, sigBase64)
		if !isValidConst {
			t.Errorf("Signature verification with constant.PublicClients failed!")
		} else {
			t.Logf("Signature verification with constant.PublicClients SUCCESSFUL!")
		}
	}
}

func TestRSAPublicAuthMiddlewareHTTP(t *testing.T) {
	gin.SetMode(gin.TestMode)
	m := &mid{}

	router := gin.New()
	v1 := router.Group("/api/public/v1")
	v1.Use(m.RSAPublicAuthMiddleware())
	v1.GET("/stations", func(c *gin.Context) {
		c.JSON(200, gin.H{"code": 200, "message": "Success"})
	})
	v1.GET("/sluice-gate/:id", func(c *gin.Context) {
		c.JSON(200, gin.H{"code": 200, "message": "Success", "id": c.Param("id")})
	})

	privKeyBytes, _ := os.ReadFile("../../logs/hsdc-key-2026-08-18.private.pem")
	block, _ := pem.Decode(privKeyBytes)
	privKey, _ := x509.ParsePKCS1PrivateKey(block.Bytes)

	signRequest := func(appID, path string, ts int64) string {
		payload := appID + fmt.Sprintf("%d", ts) + path
		hashed := sha256.Sum256([]byte(payload))
		sig, _ := rsa.SignPKCS1v15(rand.Reader, privKey, crypto.SHA256, hashed[:])
		return base64.StdEncoding.EncodeToString(sig)
	}

	appID := "hsdc-api-2026"
	now := time.Now().Unix()

	// 1. Valid request to /api/public/v1/stations
	{
		path := "/api/public/v1/stations"
		sig := signRequest(appID, path, now)

		req, _ := http.NewRequest("GET", path, nil)
		req.Header.Set("X-App-Id", appID)
		req.Header.Set("X-Timestamp", fmt.Sprintf("%d", now))
		req.Header.Set("X-Signature", sig)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != 200 {
			t.Errorf("Expected 200 OK, got %d: %s", w.Code, w.Body.String())
		} else {
			t.Logf("Valid request: 200 OK")
		}
	}

	// 2. Valid request to /api/public/v1/sluice-gate/sg_001
	{
		path := "/api/public/v1/sluice-gate/sg_001"
		sig := signRequest(appID, path, now)

		req, _ := http.NewRequest("GET", path, nil)
		req.Header.Set("X-App-Id", appID)
		req.Header.Set("X-Timestamp", fmt.Sprintf("%d", now))
		req.Header.Set("X-Signature", sig)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != 200 {
			t.Errorf("Expected 200 OK, got %d: %s", w.Code, w.Body.String())
		} else {
			t.Logf("Valid Sluice Gate request: 200 OK")
		}
	}

	// 3. Expired Timestamp (> 5 min)
	{
		path := "/api/public/v1/stations"
		oldTs := now - 600 // 10 mins ago
		sig := signRequest(appID, path, oldTs)

		req, _ := http.NewRequest("GET", path, nil)
		req.Header.Set("X-App-Id", appID)
		req.Header.Set("X-Timestamp", fmt.Sprintf("%d", oldTs))
		req.Header.Set("X-Signature", sig)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != 401 {
			t.Errorf("Expected 401 Unauthorized for expired timestamp, got %d", w.Code)
		} else {
			t.Logf("Expired timestamp correctly returned 401")
		}
	}

	// 4. Invalid Signature
	{
		path := "/api/public/v1/stations"
		req, _ := http.NewRequest("GET", path, nil)
		req.Header.Set("X-App-Id", appID)
		req.Header.Set("X-Timestamp", fmt.Sprintf("%d", now))
		req.Header.Set("X-Signature", "invalid-signature")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != 401 {
			t.Errorf("Expected 401 Unauthorized for invalid signature, got %d", w.Code)
		} else {
			t.Logf("Invalid signature correctly returned 401")
		}
	}
}
