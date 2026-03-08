package web

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
)

func GetRequest(url string, headers map[string]string, v interface{}) error {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return err
	}

	// Gắn headers
	for k, val := range headers {
		req.Header.Set(k, val)
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	return json.Unmarshal(body, &v)
}

func PostRequest(url string, headers map[string]string, payload, v interface{}) error {
	postBody, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(postBody))
	if err != nil {
		return err
	}

	// Gắn headers (nếu người dùng không set Content-Type thì mình set mặc định)
	contentTypeSet := false
	for k, val := range headers {
		req.Header.Set(k, val)
		if k == "Content-Type" {
			contentTypeSet = true
		}
	}
	if !contentTypeSet {
		req.Header.Set("Content-Type", "application/json")
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	return json.Unmarshal(body, &v)
}
