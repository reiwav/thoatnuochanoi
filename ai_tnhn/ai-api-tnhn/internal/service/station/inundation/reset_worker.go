package inundation

import (
	"context"
	"fmt"
	"time"

	"github.com/robfig/cron/v3"
	"go.mongodb.org/mongo-driver/bson"
)

func (s *service) startResetWorker() {
	loc, err := time.LoadLocation("Asia/Ho_Chi_Minh")
	if err != nil {
		loc = time.FixedZone("GMT+7", 7*60*60)
	}

	c := cron.New(cron.WithLocation(loc))
	_, err = c.AddFunc("0 7 * * *", func() {
		s.resetNotFloodedPoints(context.Background())
	})
	if err != nil {
		fmt.Printf("Inundation Reset Worker: failed to schedule cron: %v\n", err)
	} else {
		fmt.Println("Inundation Reset Worker started.")
		c.Start()
	}
}

func (s *service) resetNotFloodedPoints(ctx context.Context) {
	fmt.Println("Inundation Reset Worker: starting 7:00 AM reset...")
	filter := bson.M{
		"$or": []bson.M{
			{"report_id": ""},
			{"report_id": nil},
			{"report_id": bson.M{"$exists": false}},
		},
	}

	err := s.inundationStationRepo.R_UpdateAll(ctx, filter, bson.M{"last_report_id": ""})
	if err != nil {
		fmt.Printf("Inundation Reset Worker error: failed to reset points: %v\n", err)
		return
	}

	fmt.Println("Inundation Reset Worker: successfully reset last_report_id for not-flooded points.")

	if s.hub != nil {
		s.hub.NotifyPointChange(PointChangeInfo{
			ShareAll: true,
		})
		fmt.Println("Inundation Reset Worker: broadcasted points_updated event.")
	}
}
