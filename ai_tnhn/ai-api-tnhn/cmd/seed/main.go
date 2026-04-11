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

	// 1. Define all permissions — Group = Menu, Title = Action/Feature
	initialPermissions := []models.Permission{
		// ─── HTBC mùa mưa ───
		{Code: "ai:chat", Title: "Xem & Chat", Group: "Hệ thống báo cáo", Type: "menu", Description: "Menu tính năng & Nhập liệu Chat tự do"},
		{Code: "ai:report", Title: "Tin nhắn báo cáo", Group: "Hệ thống báo cáo", Type: "button", Description: "Tạo tin nhắn báo cáo nhanh"},
		{Code: "ai:synthesis", Title: "Tổng hợp AI", Group: "Hệ thống báo cáo", Type: "button", Description: "Báo cáo tổng hợp"},
		{Code: "ai:post-rain", Title: "Sau mưa AI", Group: "Hệ thống báo cáo", Type: "button", Description: "Báo cáo sau mưa (Words)"},
		{Code: "ai:report-emergency", Title: "BC CT KC", Group: "Hệ thống báo cáo", Type: "button", Description: "Nút tạo báo cáo công trình khẩn cấp"},

		// ─── Lượng mưa ───
		{Code: "rain:view", Title: "Xem", Group: "Lượng mưa", Type: "child_menu", Description: "Bảng mưa, phần xem của danh sách, so sánh, lịch sử"},
		{Code: "rain:create", Title: "Nhập liệu", Group: "Lượng mưa", Type: "button", Description: "Nút thêm mới lượng mưa"},
		{Code: "rain:edit", Title: "Sửa", Group: "Lượng mưa", Type: "button", Description: "Nút chỉnh sửa lượng mưa"},
		{Code: "rain:delete", Title: "Xóa", Group: "Lượng mưa", Type: "button", Description: "Nút xóa lượng mưa"},
		{Code: "rain:export", Title: "Xuất dữ liệu", Group: "Lượng mưa", Type: "button", Description: "Nút xuất Excel trong danh sách và báo cáo"},

		// ─── Điểm ngập ───
		{Code: "inundation:view", Title: "Xem", Group: "Điểm ngập", Type: "child_menu", Description: "Quyền xem danh sách, bản đồ, lịch sử và dashboard điểm ngập"},
		{Code: "inundation:create", Title: "Báo cáo", Group: "Điểm ngập", Type: "button", Description: "Nút báo cáo ngập tại Dashboard"},
		{Code: "inundation:edit", Title: "Sửa", Group: "Điểm ngập", Type: "button", Description: "Chỉnh sửa trạng thái ngập"},
		{Code: "inundation:delete", Title: "Xóa", Group: "Điểm ngập", Type: "button", Description: "Xóa báo cáo ngập"},
		{Code: "inundation:review", Title: "Nhận xét", Group: "Điểm ngập", Type: "button", Description: "Quyền rà soát và gửi nhận xét cho nhân viên"},

		// ─── Mực nước ───
		{Code: "water:view", Title: "Xem", Group: "Mực nước", Type: "child_menu", Description: "Xem bảng sông hồ, lịch sử, danh sách"},
		{Code: "water:create", Title: "Nhập liệu", Group: "Mực nước", Type: "button", Description: "Nút thêm mới dữ liệu mực nước"},
		{Code: "water:edit", Title: "Sửa", Group: "Mực nước", Type: "button", Description: "Nút chỉnh sửa dữ liệu mực nước"},
		{Code: "water:delete", Title: "Xóa", Group: "Mực nước", Type: "button", Description: "Nút xóa dữ liệu mực nước"},
		{Code: "water:export", Title: "Xuất dữ liệu", Group: "Mực nước", Type: "button", Description: "Nút xuất dữ liệu ra Excel"},

		// ─── BC CT Khẩn cấp ───
		{Code: "emergency:view", Title: "Xem", Group: "BC CT Khẩn cấp", Type: "child_menu", Description: "Xem danh sách, báo cáo, lịch sử"},
		{Code: "emergency:create", Title: "Tạo mới", Group: "BC CT Khẩn cấp", Type: "button", Description: "Nút tạo công trình khẩn cấp mới"},
		{Code: "emergency:edit", Title: "Sửa", Group: "BC CT Khẩn cấp", Type: "button", Description: "Nút cập nhật thông tin"},
		{Code: "emergency:delete", Title: "Xóa", Group: "BC CT Khẩn cấp", Type: "button", Description: "Nút xóa công trình"},
		{Code: "emergency:export", Title: "Xuất báo cáo", Group: "BC CT Khẩn cấp", Type: "button", Description: "Nút xuất danh sách báo cáo"},

		// ─── Cửa phai ───
		{Code: "cuapai:view", Title: "Xem", Group: "Cửa phai", Type: "menu", Description: "Màn hình cửa phai"},
		{Code: "cuapai:control", Title: "Điều khiển", Group: "Cửa phai", Type: "button", Description: "Chức năng đóng/mở cửa phai"},

		// ─── Trạm bơm ───
		{Code: "trambom:view", Title: "Xem", Group: "Trạm bơm", Type: "menu", Description: "Màn hình trạm bơm"},
		{Code: "trambom:create", Title: "Thêm", Group: "Trạm bơm", Type: "button", Description: "Thêm trạm bơm mới"},
		{Code: "trambom:edit", Title: "Sửa", Group: "Trạm bơm", Type: "button", Description: "Sửa thông tin trạm bơm"},
		{Code: "trambom:delete", Title: "Xóa", Group: "Trạm bơm", Type: "button", Description: "Xóa trạm bơm"},
		{Code: "trambom:control", Title: "Điều khiển", Group: "Trạm bơm", Type: "button", Description: "Bật/tắt trạng thái trạm bơm"},

		// ─── Sa hình ngập ───
		{Code: "sa-hinh-ngap:view", Title: "Xem", Group: "Sa hình ngập", Type: "menu", Description: "Xem bản đồ sa hình ngập"},

		// ─── Hệ thống → Tài khoản ───
		{Code: "employee:view", Title: "Xem", Group: "Hệ thống", Type: "child_menu", Description: "Xem danh sách tài khoản"},
		{Code: "employee:create", Title: "Thêm", Group: "Hệ thống", Type: "button", Description: "Thêm tài khoản mới"},
		{Code: "employee:edit", Title: "Sửa", Group: "Hệ thống", Type: "button", Description: "Sửa tài khoản"},
		{Code: "employee:delete", Title: "Xóa", Group: "Hệ thống", Type: "button", Description: "Xóa tài khoản"},
		// ─── Hệ thống → Đơn vị ───
		{Code: "organization:view", Title: "Xem", Group: "Hệ thống", Type: "child_menu", Description: "Xem danh sách đơn vị"},
		{Code: "organization:create", Title: "Thêm", Group: "Hệ thống", Type: "button", Description: "Thêm đơn vị mới"},
		{Code: "organization:edit", Title: "Sửa", Group: "Hệ thống", Type: "button", Description: "Sửa đơn vị"},
		{Code: "organization:delete", Title: "Xóa", Group: "Hệ thống", Type: "button", Description: "Xóa đơn vị"},
		// ─── Hệ thống → Quyền hạn ───
		{Code: "role-matrix:view", Title: "Xem", Group: "Hệ thống", Type: "child_menu", Description: "Xem phân quyền"},
		{Code: "role-matrix:edit", Title: "Sửa", Group: "Hệ thống", Type: "button", Description: "Lưu cấu hình phân quyền"},
		{Code: "role:view", Title: "Xem", Group: "Hệ thống", Type: "child_menu", Description: "Xem danh sách chức vụ"},
		{Code: "role:edit", Title: "Sửa", Group: "Hệ thống", Type: "button", Description: "Sửa chức vụ"},

		// ─── Hợp đồng ───
		{Code: "contract-ai:chat", Title: "AI Trợ lý", Group: "Hợp đồng", Type: "child_menu", Description: "Chat AI trợ lý hợp đồng"},
		{Code: "contract:view", Title: "Xem", Group: "Hợp đồng", Type: "child_menu", Description: "Danh sách hợp đồng"},
		{Code: "contract:create", Title: "Thêm", Group: "Hợp đồng", Type: "button", Description: "Tạo hợp đồng mới"},
		{Code: "contract:edit", Title: "Sửa", Group: "Hợp đồng", Type: "button", Description: "Chỉnh sửa hợp đồng"},
		{Code: "contract:delete", Title: "Xóa", Group: "Hợp đồng", Type: "button", Description: "Xóa hợp đồng"},
		{Code: "contract-category:view", Title: "Xem", Group: "Hợp đồng", Type: "child_menu", Description: "Danh mục hợp đồng"},
		{Code: "contract-category:edit", Title: "Sửa", Group: "Hợp đồng", Type: "button", Description: "Sửa danh mục"},
		{Code: "contract-category:delete", Title: "Xóa", Group: "Hợp đồng", Type: "button", Description: "Xóa danh mục"},
	}

	log.Info("Dropping old permissions collection for clean re-seed...")
	if err := mgo.DB.Collection("permissions").Drop(ctx); err != nil {
		log.Errorf("Failed to drop permissions collection: %v", err)
	}

	log.Info("Seeding permission definitions (menu:action)...")
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
		{Code: constant.ROLE_SUPER_ADMIN, Name: "Super Admin (System)", Description: "Toàn quyền hệ thống", IsCompany: true},
		{Code: constant.ROLE_CHU_TICH_CTY, Name: "Chủ tịch công ty", Description: "Ban lãnh đạo công ty", IsCompany: true},
		{Code: constant.ROLE_GIAM_DOC_CTY, Name: "Giám đốc công ty", Description: "Ban điều hành công ty", IsCompany: true},
		{Code: constant.ROLE_PHO_GIAM_DOC_CTY, Name: "Phó giám đốc công ty", Description: "Ban điều hành công ty", IsCompany: true},
		{Code: constant.ROLE_PHONG_HT_MT_CDS, Name: "Phòng HT – MT – CĐS", Description: "Phòng CNTT & Chuyển đổi số", IsCompany: true},
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
	// Theo DB: Xem/Nhập tất cả VH + AI báo cáo + Xem quản trị cơ bản
	_ = permService.UpdateMatrix(ctx, constant.ROLE_PHONG_KT_CL, []string{
		"rain:view", "rain:create", "rain:edit", "rain:export", "rain:delete",
		"inundation:view", "inundation:create", "inundation:edit", "inundation:delete", "inundation:review",
		"water:view", "water:create", "water:edit", "water:export", "water:delete",
		"cuapai:view", "trambom:view", "trambom:create", "trambom:edit", "trambom:delete",
		"ai:chat", "ai:report", "ai:synthesis", "ai:post-rain", "ai:report-emergency",
		"emergency:view", "emergency:create", "emergency:edit", "emergency:export",
		"employee:view", "organization:view", "role:view", "role-matrix:view",
		"contract:view", "contract-category:view", "contract-ai:chat",
	})
	log.Info("✓ Seeded granular role: phong_kt_cl")

	// 6 & 7. Giám đốc xí nghiệp & Trưởng phòng kỹ thuật (giam_doc_xn, truong_phong_kt)
	// Theo DB: Xem/Nhập mưa, ngập + Xem trạm bơm + CT khẩn cấp + Xem NV
	enterpriseManagerPerms := []string{
		"rain:view", "rain:create", "rain:edit", "rain:export",
		"inundation:view", "inundation:create", "inundation:edit",
		"trambom:view",
		"employee:view",
		"emergency:view", "emergency:create", "emergency:edit", "emergency:export",
	}
	_ = permService.UpdateMatrix(ctx, constant.ROLE_GIAM_DOC_XN, enterpriseManagerPerms)
	_ = permService.UpdateMatrix(ctx, constant.ROLE_TRUONG_PHONG_KT, enterpriseManagerPerms)
	log.Info("✓ Seeded granular enterprise management roles")

	// 8. Công nhân công ty (cong_nhan_cty)
	// Theo DB: Xem mưa/ngập/nước/cửa phai/trạm bơm + Báo cáo ngập + CT khẩn cấp
	_ = permService.UpdateMatrix(ctx, constant.ROLE_CONG_NHAN_CTY, []string{
		"rain:view",
		"inundation:view", "inundation:create", "inundation:edit",
		"water:view",
		"cuapai:view",
		"trambom:view",
		"emergency:view", "emergency:create",
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
