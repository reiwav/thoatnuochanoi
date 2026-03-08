package utils

import (
	gonanoid "github.com/matoous/go-nanoid/v2"
	"github.com/rs/xid"
)

func GenCode() string {
	code, err := gonanoid.New(9)
	if err != nil {
		code = xid.New().String()
	}
	return code
}
