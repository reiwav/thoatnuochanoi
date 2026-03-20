# 1. Quản lý thiết bị
- Tên, địa chỉ, ip, link, config (json) -> Quản lý cấu hình
- (2 thiết bị)
*http://14.224.214.119:8880/index.html*
*http://14.224.214.175:8880/*
config: order, tên, cod, Warning Set	High Alarm Set ( = 0 thì k cảnh báo), unit
# 2. Monitor, output, alarm k cần lưu gọi api 5s call 1 lần
# 3. Cronjob lưu dữ liệu history trend (chạy 1 phút 1 lần -> so sánh từ dưới lên trùng thì out luôn) chạy 9 thằng config
    - Timestamp
    - Value
    - warning
    - high
    - status 0,1,2 (normal, warning,high)
# 4.  Page chart lịch sử (vẽ 2 đường)Search: Hiện thị bao nhiêu vượt ngưỡng, bao nhiêu warning, kích vào show warning và vượt ngưỡng trong time nào (show popup)