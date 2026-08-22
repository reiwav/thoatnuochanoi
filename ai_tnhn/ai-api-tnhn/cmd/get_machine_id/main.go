package main

import (
	"ai-api-tnhn/pkg/machineid"
	"fmt"
	"os"
	"os/signal"
	"runtime"
	"syscall"
)

func main() {
	fmt.Println("==================================================")
	fmt.Println("       CÔNG CỤ XÁC ĐỊNH MÃ MÁY (MACHINE ID)       ")
	fmt.Println("==================================================")
	fmt.Printf("Hệ điều hành: %s (%s)\n", runtime.GOOS, runtime.GOARCH)

	id, err := machineid.GetID()
	if err != nil {
		fmt.Printf("\n[LỖI]: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("\n--------------------------------------------------")
	fmt.Printf(" MACHINE ID CỦA MÁY NÀY:  \033[1;32m%s\033[0m\n", id)
	fmt.Println("--------------------------------------------------")

	fmt.Println("\n[Chi tiết phần cứng thô phát hiện được]:")
	details := machineid.GetRawDetails()
	for k, v := range details {
		if v != "" {
			fmt.Printf(" - %-20s: %s\n", k, v)
		}
	}
	fmt.Println("==================================================")
	fmt.Println("Đã in xong mã máy. Nhấn Ctrl+C để thoát...")

	// Chờ tín hiệu dừng (Ctrl+C / PM2 stop) - Không bị lỗi deadlock
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit
}
