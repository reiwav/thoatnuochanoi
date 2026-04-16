package constants

const (
	PromptRainStopped = `Dựa trên nội dung bản tin dự báo thời tiết sau:
---
%s
---
Và số liệu thực tế đo được từ các trạm cảm biến của chúng ta: 
HIỆN TẠI KHÔNG CÓ TRẠM NÀO GHI NHẬN ĐANG CÓ MƯA (TRỜI ĐÃ TẠNH). Tuy nhiên trước đó đã ghi nhận có mưa trên địa bàn.
Chi tiết lượng mưa tích lũy trong ngày:
%s

Hãy tóm tắt thành 1 đoạn văn Báo cáo (DUY NHẤT 1 ĐOẠN) tuân theo đúng quy tắc sau:
- KHẲNG ĐỊNH: Hiện tại trên địa bàn thành phố không còn mưa (TUYỆT ĐỐI KHÔNG viết số trạm đang có mưa là 0).
- NẾU bản tin dự báo có đề cập đến các hình thế thời tiết cụ thể (như không khí lạnh, rãnh áp thấp, vùng hội tụ gió...), hãy viết: "Trên địa bàn thành phố hiện đã tạnh mưa, dù đang chịu ảnh hưởng của [tên hình thế thời tiết lấy từ bản tin]."
- NẾU bản tin dự báo KHÔNG đề cập rõ hình thế thời tiết nào cụ thể, hãy viết ĐƠN GIẢN là: "Hiện tại, trên địa bàn thành phố trời đã tạnh, không còn mưa."
- LUÔN kết thúc đoạn văn bằng câu: "Lượng mưa đo được đến thời điểm %s ngày %s/%s/%s cụ thể như sau:"

Chỉ trả về nội dung đoạn văn, KHÔNG có lời chào, KHÔNG giải thích.`

	PromptNoRain = `Dựa trên nội dung bản tin dự báo thời tiết sau:
---
%s
---
Và số liệu thực tế đo được từ các trạm cảm biến của chúng ta: 
HIỆN TẠI KHÔNG CÓ TRẠM NÀO GHI NHẬN ĐANG CÓ MƯA.
Chi tiết lượng mưa tích lũy trong ngày:
%s

Hãy tóm tắt thành 1 đoạn văn Báo cáo (DUY NHẤT 1 ĐOẠN) tuân theo đúng quy tắc sau:
- KHẲNG ĐỊNH: Hiện tại trên địa bàn thành phố không còn mưa (TUYỆT ĐỐI KHÔNG viết số trạm đang có mưa là 0).
- NẾU bản tin dự báo có đề cập đến các hình thế thời tiết cụ thể (như không khí lạnh, rãnh áp thấp, vùng hội tụ gió...), hãy viết: "Trên địa bàn thành phố hiện không ghi nhận điểm mưa nào, dù đang chịu ảnh hưởng của [tên hình thế thời tiết lấy từ bản tin]."
- NẾU bản tin dự báo KHÔNG đề cập rõ hình thế thời tiết nào cụ thể, hãy viết ĐƠN GIẢN là: "Hiện tại, trên địa bàn thành phố không ghi nhận điểm mưa nào."
- LUÔN kết thúc đoạn văn bằng câu: "Lượng mưa đo được đến thời điểm %s ngày %s/%s/%s cụ thể như sau:"

Chỉ trả về nội dung đoạn văn, KHÔNG có lời chào, KHÔNG giải thích.`

	PromptActiveRain = `Dựa trên nội dung bản tin dự báo thời tiết sau:
---
%s
---
Và số liệu thực tế đo được từ các trạm cảm biến của chúng ta: 
Hiện tại có %d điểm đang ghi nhận ĐANG CÓ MƯA.
Chi tiết:
%s

Hãy tóm tắt thành 1 đoạn văn Báo cáo (DUY NHẤT 1 ĐOẠN) tuân theo đúng quy tắc sau:
- Đánh giá mức độ: Nếu từ 1-4 điểm thì gọi là "mưa vùng", từ 5-10 điểm thì gọi là "mưa rải rác trên diện rộng", lớn hơn 10 điểm thì gọi là "mưa trên diện rộng".
- NẾU bản tin dự báo có đề cập tới hình thế thời tiết cụ thể (như không khí lạnh, rãnh áp thấp, vùng hội tụ...), hãy ghép thành câu: "Hiện tại, xuất hiện [mức độ mưa], nguyên nhân do ảnh hưởng của [tên hình thế thời tiết lấy từ bản tin]."
- NẾU bản tin dự báo KHÔNG có hình thế cụ thể, chỉ viết: "Hiện tại, trên địa bàn thành phố đang xuất hiện [mức độ mưa]."
- LUÔN kết thúc đoạn văn bằng câu: "Mưa dông xảy ra với lượng mưa đo được đến thời điểm %s ngày %s/%s/%s cụ thể như sau:"

Chỉ trả về nội dung đoạn văn, KHÔNG có lời chào, KHÔNG giải thích.`
)
