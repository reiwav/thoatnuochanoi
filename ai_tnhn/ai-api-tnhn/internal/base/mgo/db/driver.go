package db

import (
	"ai-api-tnhn/config"
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

type Mongo struct {
	Client *mongo.Client
	DB     *mongo.Database
}

func ConnectMongo(cfg config.DB) (*Mongo, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOpts := options.Client().ApplyURI(cfg.Path)

	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		return nil, err
	}

	// Ping thử
	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}

	db := client.Database(cfg.DBName)
	return &Mongo{
		Client: client,
		DB:     db,
	}, nil
}

func Connect(cfg config.DB) (*Mongo, error) {
	ctx, cancel := context.WithTimeout(
		context.Background(),
		cfg.ConnectTimeout,
	)
	defer cancel()

	opts := options.Client().
		ApplyURI(cfg.Path)

	if cfg.MaxPoolSize > 0 {
		opts.SetMaxPoolSize(cfg.MaxPoolSize)
	}
	if cfg.MinPoolSize > 0 {
		opts.SetMinPoolSize(cfg.MinPoolSize)
	}
	if cfg.DBUser != "" && cfg.DBPass != "" {
		opts.SetAuth(options.Credential{
			Username: cfg.DBUser,
			Password: cfg.DBPass,
		})
	}
	client, err := mongo.Connect(ctx, opts)
	if err != nil {
		return nil, fmt.Errorf("mongo connect error: %w", err)
	}

	// Ping để chắc chắn DB sống
	if err := client.Ping(ctx, readpref.Primary()); err != nil {
		return nil, fmt.Errorf("mongo ping error: %w", err)
	}

	db := client.Database(cfg.DBName)

	return &Mongo{
		Client: client,
		DB:     db,
	}, nil
}
