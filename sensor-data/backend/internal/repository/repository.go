package repository

import (
	"context"
	"sensor-backend/internal/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UserRepository interface {
	FindByName(ctx context.Context, username string) (*models.User, error)
	Insert(ctx context.Context, user *models.User) error
}


type DeviceRepository interface {
	FindAll(ctx context.Context) ([]models.Device, error)
	GetByID(ctx context.Context, id primitive.ObjectID) (*models.Device, error)
	UpdateConfig(ctx context.Context, id primitive.ObjectID, config []models.DeviceConfig) error
}
