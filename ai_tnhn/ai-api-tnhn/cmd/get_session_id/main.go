package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"regexp"
	"strings"
	"time"
)

func extractValue(html, fieldName string) string {
	// Match pattern: name="fieldName" ... value="val"
	re := regexp.MustCompile(fmt.Sprintf(`name="%s"[^>]*value="([^"]*)"`, regexp.QuoteMeta(fieldName)))
	matches := re.FindStringSubmatch(html)
	if len(matches) > 1 {
		return matches[1]
	}
	// Match pattern: value="val" ... name="fieldName"
	reAlt := regexp.MustCompile(fmt.Sprintf(`value="([^"]*)"[^>]*name="%s"`, regexp.QuoteMeta(fieldName)))
	matchesAlt := reAlt.FindStringSubmatch(html)
	if len(matchesAlt) > 1 {
		return matchesAlt[1]
	}
	return ""
}

func main() {
	loginURL := "https://thoatnuochanoi.vn/qlnl/dang-nhap"
	username := "admin"
	password := "Hsdc@1234"

	fmt.Println("=== BƯỚC 1: Khởi tạo HTTP Client & Cookie Jar ===")
	jar, err := cookiejar.New(nil)
	if err != nil {
		log.Fatalf("Không thể khởi tạo CookieJar: %v", err)
	}

	client := &http.Client{
		Jar:     jar,
		Timeout: 20 * time.Second,
	}

	fmt.Println("=== BƯỚC 2: Gửi yêu cầu GET để lấy trang đăng nhập ===")
	req, err := http.NewRequest("GET", loginURL, nil)
	if err != nil {
		log.Fatalf("Không thể tạo request GET: %v", err)
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	resp, err := client.Do(req)
	if err != nil {
		log.Fatalf("Lỗi gửi request GET: %v", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("Không thể đọc phản hồi GET: %v", err)
	}
	htmlContent := string(bodyBytes)

	fmt.Println("=== BƯỚC 3: Trích xuất các tham số ASP.NET ViewState ===")
	viewState := extractValue(htmlContent, "__VIEWSTATE")
	viewStateGen := extractValue(htmlContent, "__VIEWSTATEGENERATOR")
	eventValidation := extractValue(htmlContent, "__EVENTVALIDATION")

	fmt.Printf("- __VIEWSTATE: %t (độ dài: %d)\n", viewState != "", len(viewState))
	fmt.Printf("- __VIEWSTATEGENERATOR: %t (độ dài: %d)\n", viewStateGen != "", len(viewStateGen))
	fmt.Printf("- __EVENTVALIDATION: %t (độ dài: %d)\n", eventValidation != "", len(eventValidation))

	if viewState == "" || eventValidation == "" {
		log.Fatalf("Lỗi: Không tìm thấy tham số ẩn cần thiết từ trang đăng nhập.")
	}

	fmt.Println("=== BƯỚC 4: Gửi yêu cầu POST đăng nhập ===")
	formData := url.Values{}
	formData.Set("__VIEWSTATE", viewState)
	formData.Set("__VIEWSTATEGENERATOR", viewStateGen)
	formData.Set("__EVENTVALIDATION", eventValidation)
	formData.Set("txtUser", username)
	formData.Set("txtPassword", password)
	formData.Set("btnDangNhap", "Đăng nhập")

	postReq, err := http.NewRequest("POST", loginURL, strings.NewReader(formData.Encode()))
	if err != nil {
		log.Fatalf("Không thể tạo request POST: %v", err)
	}
	postReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	postReq.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	postReq.Header.Set("Referer", loginURL)

	postResp, err := client.Do(postReq)
	if err != nil {
		log.Fatalf("Lỗi gửi request POST đăng nhập: %v", err)
	}
	defer postResp.Body.Close()

	postBodyBytes, _ := io.ReadAll(postResp.Body)
	postHtml := string(postBodyBytes)

	fmt.Printf("Trạng thái HTTP: %d\n", postResp.StatusCode)
	fmt.Printf("URL cuối cùng sau redirect: %s\n", postResp.Request.URL.String())

	// Lấy cookie ASP.NET_SessionId từ Cookie Jar
	parsedURL, _ := url.Parse("https://thoatnuochanoi.vn")
	var sessionID string
	for _, cookie := range jar.Cookies(parsedURL) {
		if cookie.Name == "ASP.NET_SessionId" {
			sessionID = cookie.Value
			break
		}
	}

	if sessionID == "" {
		// Thử tìm trong cookie của URL cụ thể (với path /qlnl)
		qlnlURL, _ := url.Parse(loginURL)
		for _, cookie := range jar.Cookies(qlnlURL) {
			if cookie.Name == "ASP.NET_SessionId" {
				sessionID = cookie.Value
				break
			}
		}
	}

	fmt.Println("\n=== BƯỚC 5: Kết quả ===")
	if sessionID != "" {
		fmt.Printf("Lấy Session ID thành công!\n\n")
		fmt.Printf("ASP.NET_SessionId: %s\n\n", sessionID)
		fmt.Println("Bạn có thể cấu hình giá trị này cho hệ thống.")
	} else {
		fmt.Println("Không tìm thấy ASP.NET_SessionId trong Cookie Jar.")
	}

	// Kiểm tra xem trang có chứa thông báo lỗi đăng nhập không
	if strings.Contains(postHtml, "Sai") || strings.Contains(postHtml, "không đúng") || strings.Contains(postHtml, "Mật khẩu") {
		fmt.Println("\n[CẢNH BÁO]: Phát hiện có thể thông tin đăng nhập không chính xác hoặc trang báo lỗi.")
	}
}
