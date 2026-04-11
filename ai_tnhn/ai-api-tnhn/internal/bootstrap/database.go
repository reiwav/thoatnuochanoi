package bootstrap

import (
	"ai-api-tnhn/config"
	"ai-api-tnhn/internal/base/index"
	"ai-api-tnhn/internal/base/mgo/db"
	"context"
)

func InitDatabase(cfg config.DB) (*db.Mongo, error) {
	mongoDB, err := db.ConnectMongo(cfg)
	if err != nil {
		return nil, err
	}

	index.InitMongoSchema(context.Background(), mongoDB.DB)
	return mongoDB, nil
}
