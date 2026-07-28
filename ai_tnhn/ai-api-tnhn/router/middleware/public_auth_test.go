package middleware

import (
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"testing"
)

func generateTestRSAKeys() (privateKey *rsa.PrivateKey, publicKeyStr string, err error) {
	privateKey, err = rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, "", err
	}

	pubKeyBytes, err := x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
	if err != nil {
		return nil, "", err
	}

	pubKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: pubKeyBytes,
	})

	return privateKey, string(pubKeyPEM), nil
}

func createTestSignature(privateKey *rsa.PrivateKey, payload string) (string, error) {
	hashed := sha256.Sum256([]byte(payload))
	signature, err := rsa.SignPKCS1v15(rand.Reader, privateKey, crypto.SHA256, hashed[:])
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(signature), nil
}

func TestVerifyRSASignature(t *testing.T) {
	// 1. Setup keys
	privKey, pubKeyStr, err := generateTestRSAKeys()
	if err != nil {
		t.Fatalf("Failed to generate test keys: %v", err)
	}

	// 2. Define test data
	payload := "cic_app1700000000/api/public/v1/water/lake/lake_123"
	
	// 3. Create valid signature
	validSignature, err := createTestSignature(privKey, payload)
	if err != nil {
		t.Fatalf("Failed to create signature: %v", err)
	}

	t.Run("Valid Signature", func(t *testing.T) {
		isValid := verifyRSASignature(pubKeyStr, payload, validSignature)
		if !isValid {
			t.Errorf("Expected signature to be valid, but got invalid")
		}
	})

	t.Run("Invalid Payload (tampered data)", func(t *testing.T) {
		tamperedPayload := "cic_app1700000000/api/public/v1/water/lake/lake_999"
		isValid := verifyRSASignature(pubKeyStr, tamperedPayload, validSignature)
		if isValid {
			t.Errorf("Expected signature to be invalid for tampered payload, but got valid")
		}
	})

	t.Run("Invalid Signature format", func(t *testing.T) {
		isValid := verifyRSASignature(pubKeyStr, payload, "invalid_base64_string_!!!")
		if isValid {
			t.Errorf("Expected signature to be invalid for bad base64 format")
		}
	})

	t.Run("Wrong Public Key", func(t *testing.T) {
		// Generate another pair of keys
		_, wrongPubKeyStr, _ := generateTestRSAKeys()
		
		isValid := verifyRSASignature(wrongPubKeyStr, payload, validSignature)
		if isValid {
			t.Errorf("Expected signature to be invalid for wrong public key")
		}
	})
}
