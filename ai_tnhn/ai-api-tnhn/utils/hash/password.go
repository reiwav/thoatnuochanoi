package hash

import "golang.org/x/crypto/bcrypt"

type Password string

func NewPassword(pass string) Password {
	return Password(pass)
}
func (p Password) GererateHashedPassword() (string, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(p), 10)
	return string(hashed), err
}

func (p Password) String() string {
	return string(p)
}

func (v Password) Set(val string) {
	v = Password(val)
}

func (pOld Password) ComparePassword(pNew string) error {
	return bcrypt.CompareHashAndPassword([]byte(pOld), []byte(pNew))
}
