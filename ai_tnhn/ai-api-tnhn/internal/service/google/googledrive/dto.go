package googledrive

type FileInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Link string `json:"link,omitempty"`
}
