package machineid

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net"
	"os"
	"os/exec"
	"runtime"
	"strings"
)

// AppSalt is used to create a unique hash specific to your application
const AppSalt = "TNHN-SECURITY-LOCK-2026"

// GetID returns a unique, stable Machine ID formatted as XXXX-XXXX-XXXX-XXXX
func GetID() (string, error) {
	rawID := getRawHardwareID()
	if rawID == "" {
		// Fallback to MAC address
		rawID = getFirstMacAddress()
	}

	if rawID == "" {
		return "", fmt.Errorf("không thể xác định thông tin phần cứng của máy")
	}

	// Hash raw hardware ID with salt to produce a deterministic, secure key
	h := sha256.New()
	h.Write([]byte(AppSalt + ":" + strings.TrimSpace(rawID)))
	hashBytes := h.Sum(nil)
	hashHex := strings.ToUpper(hex.EncodeToString(hashBytes))

	// Format into 16 characters in 4 groups: XXXX-XXXX-XXXX-XXXX
	if len(hashHex) >= 16 {
		formatted := fmt.Sprintf("%s-%s-%s-%s",
			hashHex[0:4],
			hashHex[4:8],
			hashHex[8:12],
			hashHex[12:16],
		)
		return formatted, nil
	}

	return hashHex, nil
}

// GetRawDetails returns raw hardware information for debugging
func GetRawDetails() map[string]string {
	details := make(map[string]string)
	details["os"] = runtime.GOOS
	details["arch"] = runtime.GOARCH

	switch runtime.GOOS {
	case "linux":
		if data, err := os.ReadFile("/etc/machine-id"); err == nil {
			details["/etc/machine-id"] = strings.TrimSpace(string(data))
		}
		if data, err := os.ReadFile("/sys/class/dmi/id/product_uuid"); err == nil {
			details["product_uuid"] = strings.TrimSpace(string(data))
		}
		if data, err := os.ReadFile("/sys/class/dmi/id/board_serial"); err == nil {
			details["board_serial"] = strings.TrimSpace(string(data))
		}
	case "darwin":
		out, err := exec.Command("ioreg", "-rd1", "-c", "IOPlatformExpertDevice").Output()
		if err == nil {
			for _, line := range strings.Split(string(out), "\n") {
				if strings.Contains(line, "IOPlatformUUID") {
					details["IOPlatformUUID"] = strings.TrimSpace(line)
				}
			}
		}
	case "windows":
		out, err := exec.Command("wmic", "csproduct", "get", "uuid").Output()
		if err == nil {
			details["wmic_uuid"] = strings.TrimSpace(string(out))
		}
	}

	details["mac_address"] = getFirstMacAddress()
	return details
}

// getRawHardwareID collects hardware IDs based on operating system
func getRawHardwareID() string {
	var parts []string

	switch runtime.GOOS {
	case "linux":
		// 1. /etc/machine-id or /var/lib/dbus/machine-id
		for _, path := range []string{"/etc/machine-id", "/var/lib/dbus/machine-id"} {
			if data, err := os.ReadFile(path); err == nil && len(strings.TrimSpace(string(data))) > 0 {
				parts = append(parts, strings.TrimSpace(string(data)))
				break
			}
		}
		// 2. Motherboard / Product UUID
		for _, path := range []string{"/sys/class/dmi/id/product_uuid", "/sys/class/dmi/id/board_serial"} {
			if data, err := os.ReadFile(path); err == nil && len(strings.TrimSpace(string(data))) > 0 {
				parts = append(parts, strings.TrimSpace(string(data)))
			}
		}

	case "darwin": // macOS
		out, err := exec.Command("ioreg", "-rd1", "-c", "IOPlatformExpertDevice").Output()
		if err == nil {
			for _, line := range strings.Split(string(out), "\n") {
				if strings.Contains(line, "IOPlatformUUID") {
					parts = append(parts, strings.TrimSpace(line))
				}
			}
		}

	case "windows":
		out, err := exec.Command("wmic", "csproduct", "get", "uuid").Output()
		if err == nil {
			parts = append(parts, strings.TrimSpace(string(out)))
		}
	}

	if len(parts) > 0 {
		return strings.Join(parts, "|")
	}

	return ""
}

// getFirstMacAddress extracts the first valid physical MAC address
func getFirstMacAddress() string {
	interfaces, err := net.Interfaces()
	if err != nil {
		return ""
	}

	for _, iface := range interfaces {
		// Ignore loopback and down interfaces
		if iface.Flags&net.FlagLoopback != 0 || iface.Flags&net.FlagUp == 0 {
			continue
		}
		mac := iface.HardwareAddr.String()
		if len(mac) > 0 {
			return mac
		}
	}

	return ""
}

// Validate checks if the current machine matches any of the allowed machine IDs
func Validate(allowedIDs ...string) (bool, string, error) {
	currentID, err := GetID()
	if err != nil {
		return false, "", err
	}

	for _, allowed := range allowedIDs {
		if strings.EqualFold(strings.TrimSpace(allowed), currentID) {
			return true, currentID, nil
		}
	}

	return false, currentID, nil
}
