package auth

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func GenerateJWT(userID string, expire time.Duration, secret string) (string, error) {
	claims := jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(expire).Unix(),
		"iat": time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
