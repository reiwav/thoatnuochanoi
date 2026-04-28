package bootstrap

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/base/mgo/db"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/repository/query"
)

type Repositories struct {
	Token                         repository.Token
	User                          repository.User
	Organization                  repository.Organization
	Rain                          repository.Rain
	Lake                          repository.Lake
	River                         repository.River
	InundationReport              repository.InundationReport
	InundationUpdate              repository.InundationUpdate
	InundationStation             repository.InundationStation
	AiUsage                       repository.AiUsage
	AiChatLog                     repository.AiChatLog
	EmergencyConstruction         repository.EmergencyConstruction
	EmergencyConstructionHistory  repository.EmergencyConstructionHistory
	EmergencyConstructionProgress repository.EmergencyConstructionProgress
	ContractCategory              repository.ContractCategory
	Contract                      repository.Contract
	PumpingStation                repository.PumpingStation
	Permission                    repository.Permission
	RolePermission                repository.RolePermission
	Role                          repository.Role
	RainStation                   repository.RainStation
	LakeStation                   repository.LakeStation
	RiverStation                  repository.RiverStation
	HistoricalRain                repository.HistoricalRain
	AppSetting                    repository.AppSetting
	WastewaterStation             repository.WastewaterStation
	SluiceGate                    repository.SluiceGate
}

func InitRepositories(db *db.Mongo, log logger.Logger) *Repositories {
	return &Repositories{
		Token:                         query.NewTokenRepo(db.DB, "tokens", "tk", log),
		User:                          query.NewUserRepo(db.DB, "users", "usr", log),
		Organization:                  query.NewOrganizationRepository(db.DB, "organizations", "org", log),
		Rain:                          query.NewRainRepo(db.DB, "rain_records", "rain", log),
		Lake:                          query.NewLakeRepo(db.DB, "lake_records", "lake", log),
		River:                         query.NewRiverRepo(db.DB, "river_records", "river", log),
		InundationReport:              query.NewInundationRepository(db.DB, "inundation_reports", "inu", log),
		InundationUpdate:              query.NewInundationUpdateRepository(db.DB, "inundation_updates", "inuup", log),
		InundationStation:             query.NewInundationStationRepository(db.DB, "inundation_stations", "inpt", log),
		AiUsage:                       query.NewAiUsageRepo(db.DB, "ai_usage_records", "aiu", log),
		AiChatLog:                     query.NewAiChatLogRepo(db.DB, "ai_chat_logs", "ach", log),
		EmergencyConstruction:         query.NewEmergencyConstructionRepository(db.DB, "emergency_constructions", "emc", log),
		EmergencyConstructionHistory:  query.NewEmergencyConstructionHistoryRepository(db.DB, "emergency_construction_histories", "emch", log),
		EmergencyConstructionProgress: query.NewEmergencyConstructionProgressRepository(db.DB, "emergency_construction_progress", "emcp", log),
		ContractCategory:              query.NewContractCategoryRepository(db.DB, "contract_categories", "ctc", log),
		Contract:                      query.NewContractRepository(db.DB, "contracts", "ctr", log),
		PumpingStation:                query.NewPumpingStationRepo(db.DB, log),
		Permission:                    query.NewPermissionRepo(db.DB, "permissions", "perm", log),
		RolePermission:                query.NewRolePermissionRepo(db.DB, "role_permissions", "rp", log),
		Role:                          query.NewRoleRepo(db.DB, "roles", "role", log),
		RainStation:                   query.NewRainStationRepo(db.DB, "rain_stations", "rst", log),
		LakeStation:                   query.NewLakeStationRepo(db.DB, "lake_stations", "lst", log),
		RiverStation:                  query.NewRiverStationRepo(db.DB, "river_stations", "rvst", log),
		HistoricalRain:                query.NewHistoricalRainRepo(db.DB, "historical_rain_records", "hrr", log),
		AppSetting:                    query.NewAppSettingRepository(db.DB, "settings", "st", log),
		WastewaterStation:             query.NewWastewaterStationRepo(db.DB, log),
		SluiceGate:                    query.NewSluiceGateRepo(db.DB, log),
	}
}
