package main

import (
	"context"
	"fmt"
	"log"
	"time"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	uri := "mongodb://himitech:himitech%4023031993@150.95.108.247:37017"
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		log.Fatal(err)
	}
	defer client.Disconnect(ctx)

	coll := client.Database("hanoi_drainage").Collection("users")
	var user bson.M
	err = coll.FindOne(ctx, bson.M{"email": "longtm23@gmail.com"}).Decode(&user)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Role: %v\n", user["role"])
	fmt.Printf("IsCompany: %v\n", user["is_company"])
	fmt.Printf("OrgID: %v\n", user["org_id"])
}
