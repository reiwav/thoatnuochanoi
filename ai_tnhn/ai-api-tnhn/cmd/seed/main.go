package main

import (
	"ai-api-tnhn/config"
	"ai-api-tnhn/constant"
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/base/mgo/db"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository/query"
	"ai-api-tnhn/internal/service/permission"
	"ai-api-tnhn/internal/service/role"
	"context"

	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables from .env file if it exists
	_ = godotenv.Load()
	
	conf := config.LoadEnv()
	logSvc := logger.NewLogger(conf.LoggerConfig)
	log := logSvc.GetLogger()

	ctx := context.Background()
	
	log.Info("Connecting to database...")
	mgo, err := db.ConnectMongo(conf.DB)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Initialize repositories and services
	// The repo constructors require (database, collectionName, idPrefix, loggerInterface)
	permRepo := query.NewPermissionRepo(mgo.DB, "permissions", "perm", logSvc)
	rolePermRepo := query.NewRolePermissionRepo(mgo.DB, "role_permissions", "rp", logSvc)
	permService := permission.NewService(permRepo, rolePermRepo)
	
	roleRepo := query.NewRoleRepo(mgo.DB, "roles", "role", logSvc)
	roleService := role.NewService(roleRepo)

	log.Info("Starting database seeding (Role-Permission Matrix)...")

	// 1. Define all permissions based on granular business actions
	initialPermissions := []models.Permission{
		// Rainfall
		{Code: "rain:view", Title: "Xem Lượng mưa", Group: "VẬN HÀNH"},
		{Code: "rain:create", Title: "Nhập Lượng mưa", Group: "VẬN HÀNH"},
		{Code: "rain:export", Title: "Xuất dữ liệu mưa", Group: "VẬN HÀNH"},
		
		// Inundation
		{Code: "inundation:view", Title: "Xem Điểm ngập", Group: "VẬN HÀNH"},
		{Code: "inundation:create", Title: "Báo cáo Điểm ngập", Group: "VẬN HÀNH"},
		{Code: "inundation:edit", Title: "Sửa Điểm ngập", Group: "VẬN HÀNH"},
		{Code: "inundation:delete", Title: "Xóa Điểm ngập", Group: "VẬN HÀNH"},
		{Code: "sa-hinh-ngap:view", Title: "Xem Sa hình ngập", Group: "VẬN HÀNH"},

		// Water/River/Lake
		{Code: "water:view", Title: "Xem Mực nước", Group: "VẬN HÀNH"},
		{Code: "water:create", Title: "Nhập Mực nước", Group: "VẬN HÀNH"},
		{Code: "water:edit", Title: "Sửa Mực nước", Group: "VẬN HÀNH"},

		// Hardware Control
		{Code: "cuapai:view", Title: "Xem Cửa phai", Group: "VẬN HÀNH"},
		{Code: "cuapai:control", Title: "Điều khiển Cửa phai", Group: "VẬN HÀNH"},
		{Code: "trambom:view", Title: "Xem Trạm bơm", Group: "VẬN HÀNH"},
		{Code: "trambom:edit", Title: "Quản lý Trạm bơm", Group: "VẬN HÀNH"},
		{Code: "trambom:delete", Title: "Xóa Trạm bơm", Group: "VẬN HÀNH"},
		{Code: "trambom:control", Title: "Điều khiển Trạm bơm", Group: "VẬN HÀNH"},
		
		// Station Management
		{Code: "station:view", Title: "Xem Trạm đo", Group: "VẬN HÀNH"},
		{Code: "station:create", Title: "Thêm Trạm đo", Group: "VẬN HÀNH"},
		{Code: "station:edit", Title: "Sửa Trạm đo", Group: "VẬN HÀNH"},
		{Code: "station:delete", Title: "Xóa Trạm đo", Group: "VẬN HÀNH"},
		
		// Emergency Construction
		{Code: "emergency:view", Title: "Xem CT Khẩn cấp", Group: "VẬN HÀNH"},
		{Code: "emergency:create", Title: "Tạo CT Khẩn cấp", Group: "VẬN HÀNH"},
		{Code: "emergency:edit", Title: "Sửa CT Khẩn cấp", Group: "VẬN HÀNH"},
		{Code: "emergency:delete", Title: "Xóa CT Khẩn cấp", Group: "VẬN HÀNH"},

		// AI
		{Code: "ai:chat", Title: "AI: Trợ lý", Group: "AI"},
		{Code: "ai:report", Title: "AI: Báo cáo", Group: "AI"},
		{Code: "ai:synthesis", Title: "AI: Tổng hợp", Group: "AI"},
		{Code: "ai:post-rain", Title: "AI: Sau mưa", Group: "AI"},

		// Administration
		{Code: "employee:view", Title: "Xem Nhân viên", Group: "QUẢN TRỊ"},
		{Code: "employee:create", Title: "Thêm Nhân viên", Group: "QUẢN TRỊ"},
		{Code: "employee:edit", Title: "Sửa Nhân viên", Group: "QUẢN TRỊ"},
		{Code: "employee:delete", Title: "Xóa Nhân viên", Group: "QUẢN TRỊ"},
		{Code: "organization:view", Title: "Xem Chi nhánh", Group: "QUẢN TRỊ"},
		{Code: "organization:create", Title: "Thêm Chi nhánh", Group: "QUẢN TRỊ"},
		{Code: "organization:edit", Title: "Sửa Chi nhánh", Group: "QUẢN TRỊ"},
		{Code: "organization:delete", Title: "Xóa Chi nhánh", Group: "QUẢN TRỊ"},
		{Code: "role:view", Title: "Xem Quyền hạn (Matrix)", Group: "QUẢN TRỊ"},
		{Code: "role:edit", Title: "Sửa Quyền hạn (Matrix)", Group: "QUẢN TRỊ"},
		
		// Contracts
		{Code: "contract:view", Title: "Xem Hợp đồng", Group: "QUẢN TRỊ"},
		{Code: "contract:create", Title: "Thêm Hợp đồng", Group: "QUẢN TRỊ"},
		{Code: "contract:edit", Title: "Sửa Hợp đồng", Group: "QUẢN TRỊ"},
		{Code: "contract:delete", Title: "Xóa Hợp đồng", Group: "QUẢN TRỊ"},
	}

	log.Info("Seeding permission definitions (module:action)...")
	if err := permService.SeedPermissions(ctx, initialPermissions); err != nil {
		log.Fatalf("Failed to seed permissions: %v", err)
	}

	allPermCodes := []string{}
	for _, p := range initialPermissions {
		allPermCodes = append(allPermCodes, p.Code)
	}

	// 2. Map Permissions to Roles based on Organizational Matrix
	
	// Roles with Full Access (Company Level + System Admin)
	fullAccessRoles := []string{
		constant.ROLE_SUPER_ADMIN,
		constant.ROLE_CHU_TICH_CTY,
		constant.ROLE_GIAM_DOC_CTY,
		constant.ROLE_PHO_GIAM_DOC_CTY,
		constant.ROLE_PHONG_HT_MT_CDS,
	}
	for _, r := range fullAccessRoles {
		if err := permService.UpdateMatrix(ctx, r, allPermCodes); err != nil {
			log.Errorf("Failed to update matrix for role %s: %v", r, err)
		} else {
			log.Infof("✓ Seeded full access for role: %s", r)
		}
	}

	// 2.1 Seed Role metadata into the new 'roles' collection
	initialRoles := []models.Role{
		{Code: constant.ROLE_SUPER_ADMIN, Name: "Super Admin (System)", Description: "Toàn quyền hệ thống"},
		{Code: constant.ROLE_CHU_TICH_CTY, Name: "Chủ tịch công ty", Description: "Ban lãnh đạo công ty"},
		{Code: constant.ROLE_GIAM_DOC_CTY, Name: "Giám đốc công ty", Description: "Ban điều hành công ty"},
		{Code: constant.ROLE_PHO_GIAM_DOC_CTY, Name: "Phó giám đốc công ty", Description: "Ban điều hành công ty"},
		{Code: constant.ROLE_PHONG_HT_MT_CDS, Name: "Phòng HT – MT – CĐS", Description: "Phòng CNTT & Chuyển đổi số"},
		{Code: constant.ROLE_PHONG_KT_CL, Name: "Phòng Kỹ thuật chất lượng", Description: "Phòng nghiệp vụ kỹ thuật"},
		{Code: constant.ROLE_GIAM_DOC_XN, Name: "Giám đốc xí nghiệp", Description: "Lãnh đạo đơn vị cơ sở"},
		{Code: constant.ROLE_TRUONG_PHONG_KT, Name: "Trưởng phòng kỹ thuật", Description: "Quản lý kỹ thuật cơ sở"},
		{Code: constant.ROLE_CONG_NHAN_CTY, Name: "Công nhân công ty", Description: "Nhân viên vận hành hiện trường"},
	}

	for _, r := range initialRoles {
		existing, _ := roleService.GetByCode(ctx, r.Code)
		if existing == nil {
			_ = roleService.Create(ctx, &r)
			log.Infof("✓ Created Role entity: %s", r.Name)
		}
	}

	// 5. Phòng Kỹ thuật chất lượng (phong_kt_cl)
	// Full Ops View + AI Reports + Basic Admin View
	_ = permService.UpdateMatrix(ctx, constant.ROLE_PHONG_KT_CL, []string{
		"rain:view", "rain:create", "rain:export",
		"inundation:view", "inundation:create", "inundation:edit", "inundation:delete",
		"water:view", "water:create", "water:edit",
		"cuapai:view", "trambom:view",
		"ai:report", "ai:post-rain",
		"employee:view", "organization:view", "role:view",
	})
	log.Info("✓ Seeded granular role: phong_kt_cl")

	// 6 & 7. Giám đốc xí nghiệp & Trưởng phòng kỹ thuật (giam_doc_xn, truong_phong_kt)
	// Focus on local operational input
	enterpriseManagerPerms := []string{
		"rain:view", "rain:create",
		"inundation:view", "inundation:create", "inundation:edit",
		"trambom:view",
		"employee:view", "emergency:view", "emergency:create", "emergency:update",
	}
	_ = permService.UpdateMatrix(ctx, constant.ROLE_GIAM_DOC_XN, enterpriseManagerPerms)
	_ = permService.UpdateMatrix(ctx, constant.ROLE_TRUONG_PHONG_KT, enterpriseManagerPerms)
	log.Info("✓ Seeded granular enterprise management roles")

	// 8. Công nhân công ty (cong_nhan_cty)
	// View only + Field Report creation
	_ = permService.UpdateMatrix(ctx, constant.ROLE_CONG_NHAN_CTY, []string{
		"rain:view", "inundation:view", "inundation:create",
		"water:view", "cuapai:view", "trambom:view", "emergency:view", "emergency:update",
	})
	log.Info("✓ Seeded granular role: cong_nhan_cty")

	// 3. Seed Mock Users for Testing
	log.Info("Seeding mock users for testing...")
	userRepo := query.NewUserRepo(mgo.DB, "users", "usr", logSvc)
	
	mockUsers := []models.User{
		{Name: "Chủ tịch Công ty", Username: "ct_tnhn", Email: "ct@tnhn.vn", Role: constant.ROLE_CHU_TICH_CTY, Active: true, Password: "tnhn@2026"},
		{Name: "Giám đốc Công ty", Username: "gd_tnhn", Email: "gd@tnhn.vn", Role: constant.ROLE_GIAM_DOC_CTY, Active: true, Password: "tnhn@2026"},
		{Name: "Phó giám đốc Công ty", Username: "pgd_tnhn", Email: "pgd@tnhn.vn", Role: constant.ROLE_PHO_GIAM_DOC_CTY, Active: true, Password: "tnhn@2026"},
		{Name: "Phòng HT – MT – CĐS", Username: "cds_tnhn", Email: "cds@tnhn.vn", Role: constant.ROLE_PHONG_HT_MT_CDS, Active: true, Password: "tnhn@2026"},
		{Name: "Phòng Kỹ thuật chất lượng", Username: "ktcl_tnhn", Email: "ktcl@tnhn.vn", Role: constant.ROLE_PHONG_KT_CL, Active: true, Password: "tnhn@2026"},
		{Name: "Giám đốc Xí nghiệp", Username: "gdxn_tnhn", Email: "gdxn@tnhn.vn", Role: constant.ROLE_GIAM_DOC_XN, Active: true, Password: "tnhn@2026"},
		{Name: "Trưởng phòng Kỹ thuật", Username: "tp_kt", Email: "tpkt@tnhn.vn", Role: constant.ROLE_TRUONG_PHONG_KT, Active: true, Password: "tnhn@2026"},
		{Name: "Công nhân Công ty", Username: "cn_tnhn", Email: "cn@tnhn.vn", Role: constant.ROLE_CONG_NHAN_CTY, Active: true, Password: "tnhn@2026"},
	}

	for _, u := range mockUsers {
		copyUser := u // create copy for pointer
		_, err := userRepo.Create(ctx, &copyUser)
		if err != nil {
			log.Infof("ℹ Skip/Exists mock user: %s", u.Username)
		} else {
			log.Infof("✓ Created mock user: %s (pass: tnhn@2026)", u.Username)
		}
	}

	log.Info("Database seeding completed successfully!")
}
