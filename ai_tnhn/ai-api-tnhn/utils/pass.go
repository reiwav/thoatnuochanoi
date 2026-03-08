package utils

import "golang.org/x/crypto/bcrypt"

func ComparePassword(hash string, password string) bool {
	return bcrypt.CompareHashAndPassword(
		[]byte(hash),
		[]byte(password),
	) == nil
}
