Làm thêm tính năng cho quản lý sông như sau
1. Màn hình cấu hình sông:
- Thêm cấu hình category các tháng trong 1 nội dung để thực hiện cấu hình ngưỡng theo nhiều tháng cho sông. Model dạng trong AppSetting.WaterSetting như name là mùa khô, mùa mưa với các tháng sẽ chọn

AppSetting {
    Code string //water
    WaterSetting WaterSetting
}
WaterSetting {
    WaterSource string //db, api, all
    Thresholds []Threshold
}
Threshold {
    Name string // mua_kho, mua_mua
    Months []int // danh sách tháng bắt đầu từ 1-12
    Type string //mua_kho, mua_mua
}


- Màn hình quản lý sông, sẽ áp dụng AppSetting.Id này để thực hiện cấu hình ngưỡng theo tháng cho sông. Sau đó từng sông, từng sẽ được nhập thông tin ngưỡng giới hạn cao và thấp của theo tháng trong Threshold tương ứng.
2. Màn hình bảng sông hiện tại sẽ có thêm tính năng:
- Thêm tính năng hiển thị màu sắc theo mức nước dâng cao hoặc hạ thấp so với ngưỡng giới hạn cao và thấp của sông theo các tháng tương ứng. 
3. Sông có thể được tích trạm auto (nghĩa là tự động lấy dữ liệu từ api) hoặc manual nhập tay. Auto vẫn cho nhập tay.
4. Thêm màn hình nhập dữ liệu cho sông giống với bảng excel để quản lý nhập dữ liệu theo tháng cho sông. Trong đó có các trường hợp hiển thị như sau: 
TH1: nhập cố định 6h30 và 13h30
|Tên\Thông số|6h30|13h30|Hiện tại (16:50)|Chênh lệch|
|Tên sông 1  |2.5  |2.6 |2.9          |0.4      |
|Tên sông 2  |2.5  |2.6 |2.9          |0.4      |
...
|Tên sông n. |2.5  |2.6 |2.9          |0.4      |

TH2: Nhập theo 5 phút hoặc 10, 15,30,45,1h, 1h15, 1h30, 1h45, 2h (chỉ hiển thị ) cho phép chọn
|Tên\Thông số|12h05|12h10|12h15|...|12h55|13h00|Hiện tại|
|Tên sông 1  |1.2|1.3|1.4|...|1.9|2.0|2.1| 
|Tên sông 2  |1.2|1.3|1.4|...|1.9|2.0|2.1| 
...
|Tên sông n. |1.2|1.3|1.4|...|1.9|2.0|2.1| 

Người dùng có thể chọn các option để hợp lý cho người nhập
Khi nhập xong thì tự động tính toán để hiển thị theo ngưỡng. Có thể nhập trong khung giờ quá khứ, nên api phải lưu thật hợp lý

Tính năng của hồ cũng tương tự