package models

import "time"

type ChatMessage struct {
	Role    string    `json:"role"`    // "user" or "model"
	Content string    `json:"content"`
	Time    time.Time `json:"time"`
}

type ChatRequest struct {
	History []ChatMessage `json:"history"`
	Message string        `json:"message"`
}

type ChatResponse struct {
	Message string `json:"message"`
}
