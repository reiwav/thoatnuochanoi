package main

import (
	"context"
	"fmt"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	client, err := mongo.Connect(context.Background(), options.Client().ApplyURI("mongodb://localhost:27017"))
	if err != nil {
		panic(err)
	}
	defer client.Disconnect(context.Background())

	coll := client.Database("hanoi_drainage").Collection("users")
	res, err := coll.UpdateMany(
		context.Background(),
		bson.M{"email": "admin23@gmail.com"},
		bson.M{"$set": bson.M{"role": "super_admin", "active": true}},
	)
	if err != nil {
		panic(err)
	}
	fmt.Printf("Updated %v users.\n", res.ModifiedCount)
}
