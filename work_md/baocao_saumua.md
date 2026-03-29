tôi đã sửa lại file /Users/longtran/Desktop/Golang/ThoatNuocHaNoi/application/ai_tnhn/ai-api-tnhn/doc/Báo cáo mưa ngày {dd}-{mm}-{yyyy} thời điểm {hh}.docx

Số liệu mưa các phường
{table1_mua_phuong}	{table2_mua_phuong}


Số liệu mưa các xã
{table1_mua_xa}	{table2_mua_xa}
2.	Mực nước trên hệ thống sông, kênh, hồ điều hòa:
Mực nước trên các sông, hồ điều hòa tại thời điểm {hh} ngày {dd}/{mm}/{yyyy} như sau:  
Mực nước Sông			Mực nước Hồ	
{table_song}	{table2_ho}

các logic cần xử lý lại cho appscrip file /Users/longtran/Desktop/Golang/ThoatNuocHaNoi/application/appscript/app_script.gs như sau
1. table_mua_phuong được tách ra làm 2 table table1_mua_phuong và table2_mua_phuong. Logic cũ đang tạo 5 column - sửa lại thành 2 column
2. table_mua_xa được tách ra làm 2 table table1_mua_xa và table2_mua_xa. Logic cũ đang tạo 5 column - sửa lại thành 2 column
3. table_song_ho được tách ra làm 2 table table_song và table_ho. Logic cũ đang tạo 5 column - sửa lại thành 2 column


