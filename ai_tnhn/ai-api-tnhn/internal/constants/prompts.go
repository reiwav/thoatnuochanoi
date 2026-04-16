package constants

const (
	PromptRainStopped = `Dựa trên nội dung bản tin dự báo thời tiết sau:
---
%s
---
Và số liệu thực tế đo được từ các trạm cảm biến của chúng ta (hiện tại trời đã tạnh, không còn mưa, dù trước đó có mưa trên địa bàn).

Hãy tóm tắt thành 1 đoạn văn Báo cáo (DUY NHẤT 1 ĐOẠN) tuân theo đúng quy tắc sau:
- KHẲNG ĐỊNH: Hiện tại trên địa bàn thành phố không còn mưa (TUYỆT ĐỐI KHÔNG viết số trạm đang có mưa là 0).
- NẾU bản tin dự báo có đề cập đến các hình thế thời tiết cụ thể (như không khí lạnh, rãnh áp thấp, vùng hội tụ gió...), hãy viết: "Trên địa bàn thành phố hiện không còn mưa, dù đang chịu ảnh hưởng của [tên hình thế thời tiết lấy từ bản tin]."
- NẾU bản tin dự báo KHÔNG đề cập rõ hình thế thời tiết nào cụ thể, hãy viết ĐƠN GIẢN là: "Hiện tại, trên địa bàn thành phố trời đã tạnh, không còn mưa."
- KẾT THÚC đoạn văn bằng câu: "Lượng mưa đo được đến thời điểm %s ngày %s/%s/%s cụ thể như sau:"
- TUYỆT ĐỐI KHÔNG liệt kê chi tiết lượng mưa của từng trạm trong đoạn văn này.

Chỉ trả về nội dung đoạn văn, KHÔNG có lời chào, KHÔNG giải thích.`

	PromptNoRain = `Dựa trên nội dung bản tin dự báo thời tiết sau:
---
%s
---
Và số liệu thực tế đo được từ các trạm cảm biến của chúng ta (hiện tại trên địa bàn thành phố không ghi nhận điểm mưa nào).

Hãy tóm tắt thành 1 đoạn văn Báo cáo (DUY NHẤT 1 ĐOẠN) tuân theo đúng quy tắc sau:
- KHẲNG ĐỊNH: Hiện tại trên địa bàn thành phố không còn mưa (TUYỆT ĐỐI KHÔNG viết số trạm đang có mưa là 0).
- NẾU bản tin dự báo có đề cập đến các hình thế thời tiết cụ thể (như không khí lạnh, rãnh áp thấp, vùng hội tụ gió...), hãy viết: "Trên địa bàn thành phố hiện không ghi nhận điểm mưa nào, dù đang chịu ảnh hưởng của [tên hình thế thời tiết lấy từ bản tin]."
- NẾU bản tin dự báo KHÔNG đề cập rõ hình thế thời tiết nào cụ thể, hãy viết ĐƠN GIẢN là: "Hiện tại, trên địa bàn thành phố không ghi nhận điểm mưa nào."
- KẾT THÚC đoạn văn bằng câu: "Lượng mưa đo được đến thời điểm %s ngày %s/%s/%s cụ thể như sau:"
- TUYỆT ĐỐI KHÔNG liệt kê chi tiết lượng mưa của từng trạm trong đoạn văn này.

Chỉ trả về nội dung đoạn văn, KHÔNG có lời chào, KHÔNG giải thích.`

	PromptActiveRain = `Dựa trên nội dung bản tin dự báo thời tiết sau:
---
%s
---
Và số liệu thực tế đo được từ các trạm cảm biến của chúng ta (hiện tại trên địa bàn thành phố đang có %d điểm đo ghi nhận có mưa).

Hãy tóm tắt thành 1 đoạn văn Báo cáo (DUY NHẤT 1 ĐOẠN) tuân theo đúng quy tắc sau:
- Đánh giá mức độ: Nếu từ 1-4 điểm thì gọi là "mưa vùng", từ 5-10 điểm thì gọi là "mưa rải rác trên diện rộng", lớn hơn 10 điểm thì gọi là "mưa trên diện rộng".
- NẾU bản tin dự báo có đề cập tới hình thế thời tiết cụ thể (như không khí lạnh, rãnh áp thấp, vùng hội tụ...), hãy ghép thành câu: "Hiện tại, xuất hiện [mức độ mưa], nguyên nhân do ảnh hưởng của [tên hình thế thời tiết lấy từ bản tin]."
- NẾU bản tin dự báo KHÔNG có hình thế cụ thể, chỉ viết: "Hiện tại, trên địa bàn thành phố đang xuất hiện [mức độ mưa]."
- KẾT THÚC đoạn văn bằng câu: "Mưa dông xảy ra với lượng mưa đo được đến thời điểm %s ngày %s/%s/%s cụ thể như sau:"
- TUYỆT ĐỐI KHÔNG liệt kê chi tiết lượng mưa của từng trạm trong đoạn văn này.

Chỉ trả về nội dung đoạn văn, KHÔNG có lời chào, KHÔNG giải thích.`
)
