package mongo

import (
	"context"
	"sensor-backend/internal/models"
	"sensor-backend/internal/repository"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type deviceRepo struct {
	collection *mongo.Collection
}

func NewDeviceRepo(db *mongo.Database) repository.DeviceRepository {
	return &deviceRepo{collection: db.Collection("devices")}
}

func (r *deviceRepo) FindAll(ctx context.Context) ([]models.Device, error) {
	cursor, err := r.collection.Find(ctx, bson.M{"is_active": true})
	if err != nil {
		return nil, err
	}
	var res []models.Device
	err = cursor.All(ctx, &res)
	return res, err
}

func (r *deviceRepo) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Device, error) {
	var dev models.Device
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&dev)
	if err != nil {
		return nil, err
	}
	return &dev, nil
}

func (r *deviceRepo) UpdateConfig(ctx context.Context, id primitive.ObjectID, config []models.DeviceConfig) error {
	_, err := r.collection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": bson.M{"config": config}})
	return err
}
