package email

type EmailInfo struct {
	ID        uint32 `json:"id"`
	Subject   string `json:"subject"`
	From      string `json:"from"`
	Date      string `json:"date"`
	DetailAPI string `json:"detail_api"`
}

type Attachment struct {
	ID       uint32 `json:"id"`
	Filename string `json:"filename"`
	URL      string `json:"url"`
}

type EmailDetail struct {
	ID          uint32       `json:"id"`
	Subject     string       `json:"subject"`
	From        string       `json:"from"`
	Date        string       `json:"date"`
	Timestamp   int64        `json:"timestamp"`
	Body        string       `json:"body"`
	Attachments []Attachment `json:"attachments"`
}
