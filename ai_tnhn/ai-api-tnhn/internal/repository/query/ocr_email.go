package query

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/base/mgo/db"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type ocrEmailRepo struct {
	*db.Table
}

func NewOCREmailRepo(dbc *mongo.Database, colName string, log logger.Logger) repository.OCREmail {
	return &ocrEmailRepo{
		Table: db.NewTable(colName, "ocr", dbc, log),
	}
}

func (r *ocrEmailRepo) GetLatest(ctx context.Context) (*models.OCREmailRecord, error) {
	var records []*models.OCREmailRecord
	err := r.R_SelectAndSort(ctx, bson.M{}, bson.M{"email_id": -1}, 0, 1, &records)
	if err != nil || len(records) == 0 {
		return nil, err
	}
	return records[0], nil
}

func (r *ocrEmailRepo) Save(ctx context.Context, record *models.OCREmailRecord) error {
	return r.R_Create(ctx, record)
}
