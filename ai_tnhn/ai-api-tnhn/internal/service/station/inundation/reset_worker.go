package inundation

import (
	"ai-api-tnhn/utils"
	"context"
	"fmt"

	"github.com/robfig/cron/v3"
	"go.mongodb.org/mongo-driver/bson"
)

func (s *service) startResetWorker() {
	c := cron.New(cron.WithLocation(utils.VietnamLocation))
	_, err := c.AddFunc("0 7 * * *", func() {
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
