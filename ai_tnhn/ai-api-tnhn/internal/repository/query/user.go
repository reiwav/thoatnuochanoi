package query

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/base/mgo/db"
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/utils/hash"
	"ai-api-tnhn/utils/web"
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type userRepository struct {
	*db.Table
}

func NewUserRepo(dbc *mongo.Database, name, prefix string, l logger.Logger) repository.User {
	return userRepository{db.NewTable(name, prefix, dbc, l)}
}

func (p userRepository) GetByID(ctx context.Context, id string) (*models.User, error) {
	var m *models.User
	return m, p.R_SelectByID(ctx, id, &m)
}

func (p userRepository) Create(ctx context.Context, input *models.User) (*models.User, error) {
	var u *models.User
	_ = p.R_SelectOne(ctx, bson.M{
		"email": input.Email,
	}, &u)
	if u != nil {
		return nil, web.BadRequest("user existed")
	}

	str, _ := input.Password.GererateHashedPassword()
	input.Password = hash.NewPassword(str)
	return input, p.R_Create(ctx, input)
}

func (p userRepository) Update(ctx context.Context, id string, input *models.User) error {
	updateData := bson.M{
		"name":                                input.Name,
		"email":                               input.Email,
		"username":                            input.Username,
		"role":                                input.Role,
		"active":                              input.Active,
		"org_id":                              input.OrgID,
		"updated_at":                          time.Now().Unix(),
		"assigned_inundation_station_ids":     input.AssignedInundationStationIDs,
		"assigned_emergency_construction_ids": input.AssignedEmergencyConstructionIDs,
		"assigned_pumping_station_id":         input.AssignedPumpingStationID,
	}

	// Only update password if it's not empty
	if input.Password != "" {
		updateData["password"] = input.Password
	}

	_, err := p.UpdateOne(ctx, bson.M{"_id": id, "deleted_at": 0}, bson.M{"$set": updateData})
	return err
}

func (p userRepository) Delete(ctx context.Context, id string) error {
	return p.R_DeleteByID(ctx, id)
}

func (p userRepository) List(ctx context.Context, filter filter.Filter) ([]*models.User, int64, error) {
	var users []*models.User
	total, err := p.R_SearchAndCount(ctx, filter, &users)
	return users, total, err
}
