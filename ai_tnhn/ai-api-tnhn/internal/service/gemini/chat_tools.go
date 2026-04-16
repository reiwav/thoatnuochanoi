package gemini

import "github.com/google/generative-ai-go/genai"

const chatSysInstruction = `Bạn là trợ lý AI thông minh của Hệ thống Thoát nước Hà Nội (TNHN). Hãy trả lời câu hỏi của người dùng một cách lịch sự, chuyên nghiệp và hữu ích bằng tiếng Việt.

QUY TẮC TRẢ LỜI QUAN TRỌNG:
1. LƯỢNG MƯA HIỆN TẠI: Khi báo cáo lượng mưa tại các điểm, phải hiển thị đầy đủ:
   + Tên điểm (Trạm)
   + Lượng mưa (mm)
   + Giờ bắt đầu mưa (start_time)
   + Giờ kết thúc/Cập nhật mới nhất (end_time)
   + QUY TẮC HIỂN THỊ TRONG CHAT: 
       - Số trạm đang có mưa: Dùng trường 'rainy_stations' để báo số lượng (ví dụ: "Số trạm đang có mưa: 3").
       - Danh sách chi tiết: Liệt kê TOÀN BỘ các trạm có trong danh sách 'measurements'.
       - Trạng thái từng trạm: 
           * Nếu 'is_raining' là true: Báo là "Đang mưa".
           * Nếu 'is_raining' là false: Báo là "Đã tạnh (lúc [end_time])" hoặc "Không còn mưa".
       - TUYỆT ĐỐI KHÔNG được tóm tắt hay bỏ bớt bất kỳ trạm nào trong danh sách 'measurements' khi báo cáo chi tiết.

2. TÌNH TRẠNG NGẬP LỤT:
   + Chỉ sử dụng dữ liệu từ công cụ 'get_live_inundation_summary' hoặc dữ liệu về điểm ngập trong hệ thống.
   + TRÌNH BÀY DẠNG VĂN BẢN THUẦN, KHÔNG BAO GỒM ẢNH trong phần trả lời về điểm ngập.

3. KẾT HỢP DỮ LIỆU (PROXIMITY MATCHING):
   + Khi báo cáo về một điểm ngập, hãy chủ động tra cứu và hiển thị lượng mưa ở trạm đo gần khu vực đó nhất (Ví dụ: Nếu điểm ngập ở Thanh Xuân, hãy hiển thị thêm lượng mưa đo được tại trạm Thanh Xuân từ dữ liệu 'get_live_rain_summary').

4. BÁO CÁO CÔNG TRÌNH KHẨN CẤP (BC CT KC):
   + Khi người dùng yêu cầu 'Báo cáo Công trình Khẩn cấp' hoặc 'BC CT KC', hãy sử dụng công cụ 'get_unfinished_emergency_work_history' để lấy toàn bộ dữ liệu của các công trình chưa xong và toàn bộ lịch sử tiến độ của chúng.
   + Trình bày báo cáo theo từng công trình: Liệt kê tên công trình, vị trí, các cột mốc tiến độ quan trọng từ trước đến nay, % hoàn thành hiện tại và các vướng mắc, đề xuất.
   + Không cần hỏi về ngày tháng khi làm báo cáo BC CT KC vì hệ thống sẽ lấy toàn bộ lịch sử.

5. CÔNG TÁC THI CÔNG: Bạn có thể báo cáo tiến độ thi công hàng ngày cho một công trình cụ thể bằng 'report_emergency_work_progress'. Khi báo cáo, hãy hỏi: nội dung công việc, % hoàn thành, vướng mắc và ngày dự kiến xong.

6. EMAIL: Bạn có thể đọc nội dung chi tiết email. Khi liệt kê danh sách email trong bảng, hãy thêm cột 'Thao tác' với link: [Xem chi tiết](#email-detail-[ID]).
7. TRẠM BƠM: Khi báo cáo về trạm bơm, hãy trình bày ngắn gọn theo cấu trúc:
   - "Hiện tại, hệ thống ghi nhận có [X] trạm bơm."
   - "Chi tiết theo từng trạm:"
    - "[Tên trạm]: [Số lượng] tổ bơm, [chi tiết trạng thái vận hành/dừng/bảo dưỡng]. Cập nhật [thời gian/mới nhất: -]."`

func (s *service) getChatTools() []*genai.FunctionDeclaration {
	return []*genai.FunctionDeclaration{
		{
			Name:        "get_google_status",
			Description: "Lấy trạng thái hệ thống: số email và danh sách 20 email gần nhất (kèm ID và link API chi tiết), dung lượng Drive và thống kê sử dụng AI.",
		},
		{
			Name:        "get_live_rain_summary",
			Description: "Tóm tắt tình hình mưa hiện tại ở Hà Nội dựa trên dữ liệu thực tế từ các trạm đo.",
		},
		{
			Name:        "get_rain_data_by_date",
			Description: "Lấy dữ liệu lượng mưa của các trạm trong một ngày cụ thể.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"date": {Type: genai.TypeString, Description: "Ngày (YYYY-MM-DD)"},
				},
				Required: []string{"date"},
			},
		},
		{
			Name:        "get_lake_data_by_date",
			Description: "Lấy dữ liệu mực nước hồ trong một ngày cụ thể.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"date": {Type: genai.TypeString, Description: "Ngày (YYYY-MM-DD)"},
				},
				Required: []string{"date"},
			},
		},
		{
			Name:        "get_river_data_by_date",
			Description: "Lấy dữ liệu mực nước sông trong một ngày cụ thể.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"date": {Type: genai.TypeString, Description: "Ngày (YYYY-MM-DD)"},
				},
				Required: []string{"date"},
			},
		},
		{
			Name:        "get_system_overview",
			Description: "Lấy tổng quan về số lượng các trạm đo (mưa, hồ, sông) trong hệ thống.",
		},
		{
			Name:        "list_stations_by_type",
			Description: "Lấy danh sách các trạm đo theo loại (rain, lake, river). Trả về ID, tên và địa chỉ.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"type": {Type: genai.TypeString, Description: "Loại trạm: 'rain', 'lake', hoặc 'river'"},
				},
				Required: []string{"type"},
			},
		},
		{
			Name:        "get_rain_analytics",
			Description: "Lấy số liệu phân tích lượng mưa (tổng, trung bình, lớn nhất). Hỗ trợ theo năm, tháng hoặc khoảng ngày. LUÔN LUÔN sử dụng 'group_by' (như 'month' hoặc 'year') khi truy vấn dữ liệu theo năm để tránh quá tải.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"station_id": {Type: genai.TypeInteger, Description: "ID trạm (nếu muốn lọc theo trạm, để 0 nếu muốn lấy toàn thành phố)"},
					"year":       {Type: genai.TypeInteger, Description: "Năm phân tích (vd: 2024)"},
					"month":      {Type: genai.TypeInteger, Description: "Tháng phân tích (1-12, để 0 nếu muốn lấy cả năm)"},
					"start_date": {Type: genai.TypeString, Description: "Ngày bắt đầu (YYYY-MM-DD)"},
					"end_date":   {Type: genai.TypeString, Description: "Ngày kết thúc (YYYY-MM-DD)"},
					"group_by":   {Type: genai.TypeString, Description: "Nhóm theo: 'year', 'month', hoặc 'date' (mặc định là 'date', nên dùng 'month' cho báo cáo năm)"},
				},
			},
		},
		{
			Name:        "get_covered_wards",
			Description: "Lấy danh sách tất cả các phường/xã mà hệ thống đang có trạm đo và đang xử lý dữ liệu.",
		},
		{
			Name:        "get_live_water_summary",
			Description: "Lấy thông tin tổng hợp mực nước hiện tại từ các trạm đo hồ và sông.",
		},
		{
			Name:        "get_live_inundation_summary",
			Description: "Lấy thông tin tổng hợp tình hình ngập lụt hiện tại (các điểm đang ngập, chưa kết thúc).",
		},
		{
			Name:        "get_live_pumping_summary",
			Description: "Lấy thông tin tổng hợp tình hình hoạt động của các trạm bơm hiện tại (số lượng máy bơm đang chạy, bảo dưỡng, dừng).",
		},
		{
			Name:        "get_rain_summary_by_ward",
			Description: "Lấy tổng hợp lượng mưa theo từng Phường/Xã trong một khoảng thời gian.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"year":       {Type: genai.TypeInteger, Description: "Năm phân tích (vd: 2024)"},
					"month":      {Type: genai.TypeInteger, Description: "Tháng phân tích (1-12, để 0 nếu muốn lấy cả năm)"},
					"start_date": {Type: genai.TypeString, Description: "Ngày bắt đầu (YYYY-MM-DD)"},
					"end_date":   {Type: genai.TypeString, Description: "Ngày kết thúc (YYYY-MM-DD)"},
				},
			},
		},
		{
			Name:        "database_query",
			Description: "Truy vấn dữ liệu thô từ cơ sở dữ liệu MongoDB (chỉ đọc). Dùng khi các công cụ khác không đáp ứng được. LUÔN LUÔN sử dụng bộ lọc (filter) để giới hạn dữ liệu nếu có thể.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"collection": {Type: genai.TypeString, Description: "Tên bộ sưu tập (vd: rain_stations, lake_records, inundation_stations)"},
					"filter":     {Type: genai.TypeObject, Description: "Bộ lọc MongoDB (vd: {\"quan\": \"Ba Đình\"})"},
				},
				Required: []string{"collection"},
			},
		},
		{
			Name:        "read_email_by_title",
			Description: "Tìm và đọc chi tiết một email (đã đọc hoặc chưa đọc) dựa trên tiêu đề trong số các email gần nhất. Trả về nội dung email và các link tải file đính kèm nếu có.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"title": {Type: genai.TypeString, Description: "Tiêu đề email cần tìm (fuzzy search)"},
				},
				Required: []string{"title"},
			},
		},
		{
			Name:        "read_email_by_id",
			Description: "Đọc chi tiết một email dựa trên ID duy nhất. Dùng khi người dùng nhấn nút 'Xem chi tiết' từ bảng danh sách.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"id": {Type: genai.TypeInteger, Description: "ID duy nhất của email (SeqNum)"},
				},
				Required: []string{"id"},
			},
		},
		{
			Name:        "report_emergency_work_progress",
			Description: "Báo cáo tiến độ công việc hàng ngày cho một công trình khẩn. Bạn cần ID công trình (construction_id).",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"construction_id":          {Type: genai.TypeString, Description: "ID của công trình"},
					"work_done":                {Type: genai.TypeString, Description: "Mô tả công việc đã làm được trong ngày"},
					"progress_percentage":      {Type: genai.TypeInteger, Description: "Phần trăm hoàn thành của công trình (0-100)"},
					"issues":                   {Type: genai.TypeString, Description: "Các vướng mắc, khó khăn gặp phải (nếu có)"},
					"is_completed":             {Type: genai.TypeBoolean, Description: "Công trình đã hoàn thành chưa?"},
					"expected_completion_date": {Type: genai.TypeString, Description: "Ngày dự kiến hoàn thành nếu chưa xong (YYYY-MM-DD)"},
				},
				Required: []string{"construction_id", "work_done"},
			},
		},
		{
			Name:        "get_emergency_work_history",
			Description: "Lấy lịch sử báo cáo tiến độ thi công của một công trình khẩn theo ID.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"construction_id": {Type: genai.TypeString, Description: "ID của công trình"},
				},
				Required: []string{"construction_id"},
			},
		},
		{
			Name:        "get_emergency_constructions",
			Description: "Lấy danh sách tất cả các công trình khẩn đang có trong hệ thống.",
		},
		{
			Name:        "get_recent_emergency_reports",
			Description: "Lấy danh sách các báo cáo tiến độ gần đây của tất cả các công trình khẩn. Hỗ trợ lọc theo ngày.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"start_date": {Type: genai.TypeString, Description: "Ngày bắt đầu (YYYY-MM-DD), mặc định là hôm kia nếu để trống"},
					"end_date":   {Type: genai.TypeString, Description: "Ngày kết thúc (YYYY-MM-DD), mặc định là hôm nay nếu để trống"},
				},
			},
		},
		{
			Name:        "get_unfinished_emergency_work_history",
			Description: "Lấy TOÀN BỘ lịch sử báo cáo tiến độ của tất cả các công trình CHƯA HOÀN THÀNH. Không cần lọc theo ngày.",
		},
	}
}
