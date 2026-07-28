package query

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type ocrEmailRepo struct {
	db   *mongo.Database
	col  *mongo.Collection
	log  logger.Logger
}

func NewOCREmailRepo(db *mongo.Database, colName string, log logger.Logger) repository.OCREmail {
	return &ocrEmailRepo{
		db:  db,
		col: db.Collection(colName),
		log: log,
	}
}

func (r *ocrEmailRepo) GetLatest(ctx context.Context) (*models.OCREmailRecord, error) {
	var record models.OCREmailRecord
	opts := options.FindOne().SetSort(bson.D{{Key: "email_id", Value: -1}})
	err := r.col.FindOne(ctx, bson.M{}, opts).Decode(&record)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil // Not found, return nil without error
		}
		return nil, err
	}
	return &record, nil
}

func (r *ocrEmailRepo) Save(ctx context.Context, record *models.OCREmailRecord) error {
	record.BeforeCreate("ocr")
	_, err := r.col.InsertOne(ctx, record)
	return err
}
