package main

import (
	"ai-api-tnhn/config"
	"ai-api-tnhn/internal/base/mgo/db"
	"ai-api-tnhn/internal/base/model"
	"ai-api-tnhn/internal/models"
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	conf := config.LoadEnv()
	client, err := db.ConnectMongo(conf.DB)
	if err != nil {
		panic(err)
	}

	coll := client.DB.Collection("inundation_points")

	points := []models.InundationPoint{
		{
			BaseModel: model.BaseModel{
				ID:    "p1",
				CTime: time.Now().Unix(),
				MTime: time.Now().Unix(),
			},
			OrgID:   "org_001",
			Name:    "Thái Hà - Chùa Bộc",
			Address: "Ngã tư Thái Hà - Chùa Bộc, Đống Đa, Hà Nội",
			Lat:     "21.0116",
			Lng:     "105.8225",
			Active:  true,
		},
		{
			BaseModel: model.BaseModel{
				ID:    "p2",
				CTime: time.Now().Unix(),
				MTime: time.Now().Unix(),
			},
			OrgID:   "org_001",
			Name:    "Nguyễn Khuyến",
			Address: "Phố Nguyễn Khuyến (trước cổng trường Lý Thường Kiệt), Đống Đa, Hà Nội",
			Lat:     "21.0264",
			Lng:     "105.8407",
			Active:  true,
		},
		{
			BaseModel: model.BaseModel{
				ID:    "p3",
				CTime: time.Now().Unix(),
				MTime: time.Now().Unix(),
			},
			OrgID:   "org_001",
			Name:    "Hoa Bằng",
			Address: "Phố Hoa Bằng (từ số nhà 91 đến 165), Cầu Giấy, Hà Nội",
			Lat:     "21.0345",
			Lng:     "105.7951",
			Active:  true,
		},
	}

	for _, p := range points {
		res, err := coll.UpdateOne(
			context.Background(),
			bson.M{"_id": p.ID},
			bson.M{"$set": p},
			options.Update().SetUpsert(true),
		)
		if err != nil {
			fmt.Printf("Error processing %s: %v\n", p.Name, err)
		} else {
			fmt.Printf("Processed point: %s (Matched: %d, Modified: %d, UpsertedID: %v)\n", p.Name, res.MatchedCount, res.ModifiedCount, res.UpsertedID)
		}
	}
}
