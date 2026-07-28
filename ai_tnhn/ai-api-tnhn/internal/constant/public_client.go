package constant

type PublicClientInfo struct {
	AppName   string
	PublicKey string
}

// PublicClients stores the configuration for third-party clients (Phase 1)
//
// HOW TO GENERATE RSA KEYS & SIGNATURE (Compatible with our RS256 PKCS1v15 check):
// 1. Generate Private Key:
//    openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048
//    (or openssl genrsa -out private.pem 2048)
// 2. Generate Public Key (to put in PublicKey field below):
//    openssl rsa -pubout -in private.pem -out public.pem
//
// 3. How Client generates Signature (Bash example):
//    # Payload = AppID + Timestamp + URLPath
//    echo -n "cic_app1700000000/api/public/v1/water/lake" > payload.txt
//    # Sign using SHA256 and PKCS1v15
//    openssl dgst -sha256 -sign private.pem -out sign.bin payload.txt
//    # Encode to Base64 to put in X-Signature header
//    base64 sign.bin > signature.b64
//
// Replace the PublicKey with the actual valid RSA PEM public key.
var PublicClients = map[string]PublicClientInfo{
	"cic_app": {
		AppName: "Đối tác CIC",
		// PRIVATE KEY (Dành cho bên thứ 3 test, đừng commit file này lên production mà chưa xoá dòng này nha):
		// -----BEGIN PRIVATE KEY-----
		// MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCpebHcMLV7JYH4
		// PxtqQOVSePJ6OgfOeeVJDb+SWm19wTAZ2SBoSOMkMLD1F6yCoUGZQynB7OB7YRtA
		// SQBjPHFaGEsXNyOGy6dWQrn00VC/qmjvbF9B6qTiUuvLpXgHS+tIJWQabAEERyqA
		// AUWSbL3OYUpfx5JzCahWDug96Pa26hW8zbKamWoJl5/fp3FTdc6dzqRuOJKthlnB
		// bCyaHdDFZqdKpp2Z3bicDgnQCJGXlJWSfQXgdm+JPk+LCfIhfb3Ertw6N41YaJdk
		// tmQ0Wtto3LgY9zyjRN6EzmhuZB30UHgHXa4jTwAShNTQ/bBwHvkSr094wI0ph120
		// u7c1HQTvAgMBAAECggEAB41hRC81fyniO1ZQmfEPZxf1skWwwF5FPfarYVG/TFnW
		// E2jOHWeWG7BByoJGEUIvYq2QCFDOhiEDLl+ycTmp0XqAqiWuYxzjNaBemg7T2t60
		// s2qwagcTVvScBmS2zxhugTYNWnISr4aeWbr0xzwqTy6dulvx5kd5ZXBfoBaoG+mK
		// 3xNIrOpMwoDD/PIj7tbv0QXR9eHGjs+8HP0yAPQkP1YKWAjW+ZRhi0TPo+l0NmyF
		// aSU4oZTVOmPBjm6gmzs7E6Ns9tmuLQPyJOt/WBGpjab+Tf8M6//1mQxjpgASCPfZ
		// YFDWvFcEk1JVslhDmB0OYIOCMILYobzXf4vUdxz6qQKBgQDrgqo24QdE7ik9DYGJ
		// JQl66N5sVC8sfEv5axX7QMvXq9EHwBnKJ3AApcDT5Vc/wHmEYezJrfTbLTPwvU5y
		// kV+EVJ7CpDr60sJon0fr3Se2BabZIBAgNx+9YlYswIvgzv+g43340hpK61eSmu99
		// Y1/+Ser3hW9OM/3fQoSDXlqXZwKBgQC4OEjCUIReGdnlrFAq+iXLOscFroFzHSxF
		// MCKmy5E+Qz1hpju+PcKD4ZVnSp/HDB4Eo+hOLyJyBcnFvUfgWQpX3a1CMLsievHF
		// ruQ2jH6FCWcMxgfyCUd7a30JdjUmvwf3xxImYMlWD2LQowP+KPVIkrFvknRAh5Md
		// jVEEKK3ZOQKBgEt1FCB9PR0Cyce7+hL9AOqWjh1bY7n3IUiK3QIhoq45aMH49Mpm
		// lGZAtWWvB6Nvgf++eGWuDNPkyc2KegYPOfFmQ2/Nuu/+czeeQSb7NuwFJ45NzZzk
		// zJCbX0z7bFXdPN5JxWThvHbgrLBWYAFmw6zv9g7Ue/MsiVztLRQCOThlAoGAbs9E
		// TMXb6TKJlBJjIobXRvizEGLYcOLCZ1e98DCQzC/r8xnn49YIdAW0Na54j2VlhQsG
		// yEin4ohCx1PEsVk91H5+IktntSTY2z0I/xrhW6q9NrzDuL4GJmIQkylsbUMJSuyO
		// qVEcqkyU9sSnuTDv4diDLIaesNYcEvGXIvZJJFkCgYA+Nk6LP/Hxm82HaMlxbSb9
		// fmdbrnnjd2J2N3wKk2BZOAmpX47akBVkGYo1e9frE3CkPDqNr8uo+aW26kgr1hLc
		// SUhpcC7749gVh3L19F1vYKLQiZI6Wssqca66ST++YyD6AK2R9Ow8Qhy+gHf1wCEZ
		// YT8zGtCYfAwNcCcxi0GaTw==
		// -----END PRIVATE KEY-----
		PublicKey: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqXmx3DC1eyWB+D8bakDl
UnjyejoHznnlSQ2/klptfcEwGdkgaEjjJDCw9ResgqFBmUMpwezge2EbQEkAYzxx
WhhLFzcjhsunVkK59NFQv6po72xfQeqk4lLry6V4B0vrSCVkGmwBBEcqgAFFkmy9
zmFKX8eScwmoVg7oPej2tuoVvM2ymplqCZef36dxU3XOnc6kbjiSrYZZwWwsmh3Q
xWanSqadmd24nA4J0AiRl5SVkn0F4HZviT5PiwnyIX29xK7cOjeNWGiXZLZkNFrb
aNy4GPc8o0TehM5obmQd9FB4B12uI08AEoTU0P2wcB75Eq9PeMCNKYddtLu3NR0E
7wIDAQAB
-----END PUBLIC KEY-----`,
	},
}
