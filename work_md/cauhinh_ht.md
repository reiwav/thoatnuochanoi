Làm 1 menu cấu hình trong hệ thống có tính năng sau:
1. Cấu hình điểm ngập cho ngập các ngưỡng và màu sắc hiển thị trên bản đồ cũng như trạng thái của điểm ngập
Ví dụ:
+ Sâu: 0  -> bình thường (chưa ngập) (Dành cho công tác chuẩn bị trước trận mưa, anh em công nhân đi rà soát hiện trường up ảnh lên báo cáo)
+ Sâu 0,1m: ứ đọng;   
+ Sâu 0,2m: ngập nhẹ
+ > 0,3m: ngập ahgt (ngập ảnh hưởng giao thông)
Làm thêm thêm api và giao diện giúp tôi
Model như sau:

type AppSetting struct {
    model.BaseModel  `bson:",inline"`
    Code string `json:"code" bson:"code"`// FloodLevel
    FloodLevels []FloodLevel `json:"flood_levels" bson:"flood_levels"`
}    
AppSetting có thể cấu hình được nhiều loai, trước hết chỉ có FloodLevel
Màn hình cấu hình này sẽ update vào AppSetting.Code="FloodLevel" mỗi khi thêm mới hoặc thay đổi từng mức độ
type FloodLevel struct {
	Code        string    `json:"code" bson:"code"` // flood_level_1, flood_level_2, flood_level_3, flood_level_4
	Name        string    `json:"name" bson:"name"` // Bình thường, ứ đọng, ngập nhẹ, ngập ahgt
	MinDepth    float64   `json:"min_depth" bson:"min_depth"`
	MaxDepth    float64   `json:"max_depth" bson:"max_depth"`
	Color       string    `json:"color" bson:"color"` // Màu sắc hiển thị trên bản đồ
	Description string    `json:"description" bson:"description"` // Mô tả
	User        string    `json:"user" bson:"user"` // Người tạo
    Ctime       time.Time `json:"ctime" bson:"ctime"` // Thời gian tạo
	IsFlooding  bool      `json:"is_flooding" bson:"is_flooding"` // Trạng thái
}

Thêm IsFlooding để có thể bật tắt từng mức độ, khi tắt thì sẽ không hiển thị trên bản đồ