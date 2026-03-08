package web

type ListResponse struct {
	Total int64       `json:"total"`
	Data  interface{} `json:"data"`
}
