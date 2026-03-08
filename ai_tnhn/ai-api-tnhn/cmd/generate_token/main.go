package main

import (
	"context"
	"fmt"
	"net/http"
	"os"

	"ai-api-tnhn/config"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/drive/v3"
)

func main() {
	conf := config.LoadEnv()

	oauth := &oauth2.Config{
		ClientID:     conf.OAuthConfig.ClientID,
		ClientSecret: conf.OAuthConfig.ClientSecret,
		Endpoint:     google.Endpoint,
		RedirectURL:  conf.OAuthConfig.CallbackURL, // Must match the authorized URI: http://localhost:8089/api/auth/google/callback
		Scopes:       []string{drive.DriveScope},
	}

	url := oauth.AuthCodeURL("state-token", oauth2.AccessTypeOffline, oauth2.ApprovalForce)
	fmt.Printf("\n=== BƯỚC 1: TẮT BACKEND ===\n")
	fmt.Printf("Nếu ứng dụng backend (go run main.go) đang chạy ở cửa sổ khác, hãy NHẤN Ctrl+C ĐỂ TẮT NÓ ĐI.\n")
	fmt.Printf("Script này cần sử dụng cổng 8089 để nhận phản hồi từ Google.\n\n")

	fmt.Printf("=== BƯỚC 2: MỞ LINK SAU ĐỂ CẤP QUYỀN ===\n")
	fmt.Printf("%v\n\n", url)

	http.HandleFunc("/api/auth/google/callback", func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("code")
		if code == "" {
			fmt.Fprintln(w, "Không tìm thấy code trong URL.")
			return
		}

		tok, err := oauth.Exchange(context.TODO(), code)
		if err != nil {
			fmt.Fprintf(w, "Không thể lấy token: %v", err)
			return
		}

		fmt.Fprintf(w, "<h2 style='color:green;'>THÀNH CÔNG!</h2><p>Bạn có thể đóng tab trình duyệt này lại. Hãy xem terminal để lấy Refresh Token.</p>")

		fmt.Printf("\n=== BƯỚC 3: LƯU REFRESH TOKEN ===\n")
		fmt.Printf("Vui lòng COPY đoạn dưới đây và dán vào cuối file `ai-api-tnhn/.env`:\n\n")
		fmt.Printf("GOOGLE_REFRESH_TOKEN=\"%s\"\n\n", tok.RefreshToken)
		fmt.Printf("Sau khi đã dán xong, bạn có thể chạy lại backend ('go run main.go') như bình thường.\n")
		fmt.Printf("Chương trình tạo token sẽ tự động kết thúc...\n")

		go func() {
			os.Exit(0)
		}()
	})

	fmt.Printf("Đang chờ xác thực tại http://localhost:8089 ...\n")
	if err := http.ListenAndServe(":8089", nil); err != nil {
		fmt.Printf("\n[LỖI]: Không thể khởi động server nội bộ. \nVui lòng đảm bảo BẠN ĐÃ TẮT BACKEND 'go run main.go' (cổng 8089 đang bị chiếm dụng) trước khi chạy lệnh này.\nChi tiết lỗi: %v\n", err)
	}
}
