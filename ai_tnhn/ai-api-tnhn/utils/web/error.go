package web

import (
	"net/http"
)

type IHttpError interface {
	StatusCode() int
}
type BadRequest string
type ErrorOK string

func (e BadRequest) Error() string {
	return string(e)
}

func (e BadRequest) StatusCode() int {
	return http.StatusBadRequest
}

func (e ErrorOK) Error() string {
	return string(e)
}

func (e ErrorOK) StatusCode() int {
	return http.StatusOK
}

func WrapBadRequest(err error, message string) error {
	if err != nil {
		return BadRequest(message + ":" + err.Error())
	}
	return nil
}

func BadRequestNotFound(err error) error {
	if err != nil {
		return NotFound(err.Error())
	}
	return nil
}

func IsErrorRecord(err error) error {
	if err != nil && err.Error() == "not found" {
		return nil
	}
	return err
}

type Unauthorized string

func (e Unauthorized) Error() string {
	return string(e)
}

func (e Unauthorized) StatusCode() int {
	return http.StatusUnauthorized
}

type InternalServerError string

func (e InternalServerError) Error() string {
	return string(e)
}

func (e InternalServerError) StatusCode() int {
	return http.StatusInternalServerError
}

type NotFound string

func (e NotFound) Error() string {
	return string(e)
}

func (e NotFound) StatusCode() int {
	return http.StatusNotFound
}
