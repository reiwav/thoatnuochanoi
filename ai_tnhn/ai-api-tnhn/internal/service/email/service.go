package email

import (
	"ai-api-tnhn/config"
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/emersion/go-imap"
	"github.com/emersion/go-imap/client"
	"github.com/emersion/go-message/mail"
	"github.com/ledongthuc/pdf"
	"github.com/nguyenthenguyen/docx"
	"github.com/xuri/excelize/v2"
)

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

type Service interface {
	GetLatestRainWarning(ctx context.Context) (string, error)
	GetUnreadCount(ctx context.Context) (int, error)
	GetRecentEmails(ctx context.Context, limit int) ([]EmailInfo, error)
	GetUnreadEmails(ctx context.Context, limit int) ([]EmailInfo, error)
	ReadEmailByTitle(ctx context.Context, title string) (*EmailDetail, error)
	ReadEmailByID(ctx context.Context, id uint32) (*EmailDetail, error)
	GetLatestEmailByFilter(ctx context.Context) (*EmailInfo, error)
	GetLatestEmailAttachmentPage1(ctx context.Context) (string, error)
	GetLatestEmailAttachmentRaw(ctx context.Context) ([]byte, string, error)
	GetLatestWeatherEmailID(ctx context.Context) (uint32, error)
	GetEmailAttachmentRawByID(ctx context.Context, id uint32) ([]byte, string, error)
	DownloadAttachment(ctx context.Context, emailID uint32, attachmentID uint32) ([]byte, error)
}

type service struct {
	conf config.EmailConfig
}

func NewService(conf config.EmailConfig) Service {
	return &service{conf: conf}
}

func (s *service) GetLatestRainWarning(ctx context.Context) (string, error) {
	// 1. Connect to IMAP server
	c, err := client.DialTLS(s.conf.IMAPServer, nil)
	if err != nil {
		return "", fmt.Errorf("failed to connect to IMAP: %w", err)
	}
	defer c.Logout()

	// 2. Login (Sanitize password by removing spaces)
	cleanPassword := strings.ReplaceAll(s.conf.Password, " ", "")
	if err := c.Login(s.conf.User, cleanPassword); err != nil {
		return "", fmt.Errorf("failed to login to IMAP: %w", err)
	}

	// 3. Select INBOX
	mbox, err := c.Select("INBOX", false)
	if err != nil {
		return "", fmt.Errorf("failed to select INBOX: %w", err)
	}

	if mbox.Messages == 0 {
		return "No emails found in INBOX", nil
	}

	// 4. Search for emails from the specified sender
	criteria := imap.NewSearchCriteria()
	criteria.Header.Set("From", s.conf.FromFilter)
	ids, err := c.Search(criteria)
	if err != nil {
		return "", fmt.Errorf("failed to search emails: %w", err)
	}

	if len(ids) == 0 {
		return "No emails found from " + s.conf.FromFilter, nil
	}

	// 5. Get the latest email ID
	latestID := ids[len(ids)-1]
	seqset := new(imap.SeqSet)
	seqset.AddNum(latestID)

	// Fetch the message body
	var section imap.BodySectionName
	items := []imap.FetchItem{section.FetchItem()}

	messages := make(chan *imap.Message, 1)
	done := make(chan error, 1)
	go func() {
		done <- c.Fetch(seqset, items, messages)
	}()

	msg := <-messages
	if msg == nil {
		return "Message not found", nil
	}
	if err := <-done; err != nil {
		return "", fmt.Errorf("failed to fetch message: %w", err)
	}

	r := msg.GetBody(&section)
	if r == nil {
		return "Message body not found", nil
	}

	// 6. Parse message and find PDF attachment
	mr, err := mail.CreateReader(r)
	if err != nil {
		return "", fmt.Errorf("failed to create mail reader: %w", err)
	}

	for {
		p, err := mr.NextPart()
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", fmt.Errorf("failed to read next part: %w", err)
		}

		switch h := p.Header.(type) {
		case *mail.AttachmentHeader:
			filename, _ := h.Filename()
			lowerName := strings.ToLower(filename)
			if strings.HasSuffix(lowerName, ".pdf") {
				return s.extractTextFromPDF(p.Body, 0) // 0 means all pages
			}
			if strings.HasSuffix(lowerName, ".docx") {
				return s.extractTextFromDocx(p.Body)
			}
			if strings.HasSuffix(lowerName, ".xlsx") {
				return s.extractTextFromXlsx(p.Body)
			}
		}
	}

	return "No PDF attachment found in the latest email", nil
}

func (s *service) extractTextFromPDF(r io.Reader, pageLimit int) (string, error) {
	// Read entire content to memory because pdf.NewReader needs io.ReaderAt and size
	// 1. Read all content first to handle non-seeking readers and get length
	content, err := io.ReadAll(r)
	if err != nil {
		return "", fmt.Errorf("failed to read PDF body: %w", err)
	}
	contentLen := int64(len(content))
	fmt.Printf("DEBUG: PDF content buffered, size: %d bytes\n", contentLen)

	if contentLen == 0 {
		return "", fmt.Errorf("PDF content is empty")
	}

	readerAt := bytes.NewReader(content)
	pdfReader, err := pdf.NewReader(readerAt, contentLen)
	if err != nil {
		return "", fmt.Errorf("failed to create PDF reader: %w", err)
	}

	var buf bytes.Buffer
	numPages := pdfReader.NumPage()
	fmt.Printf("DEBUG: Found PDF with %d pages\n", numPages)
	if pageLimit > 0 && numPages > pageLimit {
		numPages = pageLimit
	}

	for i := 1; i <= numPages; i++ {
		p := pdfReader.Page(i)
		if p.V.IsNull() {
			continue
		}

		text, err := p.GetPlainText(nil)
		if err != nil {
			fmt.Printf("DEBUG: Error getting plain text from page %d: %v\n", i, err)
			continue
		}

		if text == "" {
			// Fallback: try to get text from tokens
			var fallbackBuf bytes.Buffer
			contentStruct := p.Content()
			for _, t := range contentStruct.Text {
				fallbackBuf.WriteString(t.S)
			}
			text = fallbackBuf.String()
			if text != "" {
				fmt.Printf("DEBUG: Page %d: PlainText empty, used FallbackText (len: %d)\n", i, len(text))
			} else {
				fmt.Printf("DEBUG: Page %d: Both PlainText and FallbackText are empty\n", i)
			}
		} else {
			fmt.Printf("DEBUG: Page %d: PlainText length: %d\n", i, len(text))
		}

		buf.WriteString(text)
	}

	rawText := buf.String()
	fmt.Printf("DEBUG: Raw extracted text length: %d\n", len(rawText))
	if len(rawText) > 0 {
		snippetLen := 100
		if len(rawText) < snippetLen {
			snippetLen = len(rawText)
		}
		fmt.Printf("DEBUG: First %d chars: %s\n", snippetLen, rawText[:snippetLen])
	}

	return s.cleanExtractedText(rawText), nil
}

func (s *service) cleanExtractedText(text string) string {
	// 1. Replace multiple newlines with a single newline or space
	re := regexp.MustCompile(`\n+`)
	text = re.ReplaceAllString(text, " ")

	// 2. Replace multiple spaces with a single space
	re = regexp.MustCompile(`\s+`)
	text = re.ReplaceAllString(text, " ")

	// 3. Trim whitespace
	text = strings.TrimSpace(text)

	// 4. Extract section from "1. Hiện trạng" to before "2."
	startKey := "1. Hiện trạng"
	endKey := "2."

	idxStart := strings.Index(text, startKey)
	if idxStart != -1 {
		segment := text[idxStart:]
		idxEnd := strings.Index(segment[len(startKey):], endKey)
		if idxEnd != -1 {
			return strings.TrimSpace(segment[:len(startKey)+idxEnd])
		}
		return strings.TrimSpace(segment)
	}

	return text
}

func (s *service) extractTextFromDocx(r io.Reader) (string, error) {
	content, err := io.ReadAll(r)
	if err != nil {
		return "", err
	}

	readerAt := bytes.NewReader(content)
	d, err := docx.ReadDocxFromMemory(readerAt, int64(len(content)))
	if err != nil {
		return "", fmt.Errorf("failed to read docx: %w", err)
	}
	defer d.Close()

	return d.Editable().GetContent(), nil
}

func (s *service) extractTextFromXlsx(r io.Reader) (string, error) {
	f, err := excelize.OpenReader(r)
	if err != nil {
		return "", fmt.Errorf("failed to open xlsx: %w", err)
	}
	defer f.Close()

	var buf bytes.Buffer
	sheets := f.GetSheetList()
	for _, sheet := range sheets {
		rows, err := f.GetRows(sheet)
		if err != nil {
			continue
		}
		for _, row := range rows {
			for _, colCell := range row {
				buf.WriteString(colCell)
				buf.WriteString(" ")
			}
			buf.WriteString("\n")
		}
	}

	return buf.String(), nil
}

func (s *service) connectIMAP() (*client.Client, error) {
	// 1. Connect to IMAP server
	c, err := client.DialTLS(s.conf.IMAPServer, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to IMAP: %w", err)
	}

	// 2. Login
	cleanPassword := strings.ReplaceAll(s.conf.Password, " ", "")
	if err := c.Login(s.conf.User, cleanPassword); err != nil {
		c.Logout()
		return nil, fmt.Errorf("failed to login to IMAP: %w", err)
	}
	return c, nil
}

func (s *service) GetUnreadCount(ctx context.Context) (int, error) {
	c, err := s.connectIMAP()
	if err != nil {
		return 0, err
	}
	defer c.Logout()

	// 3. Select INBOX
	_, err = c.Select("INBOX", true) // read-only
	if err != nil {
		return 0, fmt.Errorf("failed to select INBOX: %w", err)
	}

	// 4. Search for unread emails
	criteria := imap.NewSearchCriteria()
	criteria.WithoutFlags = []string{imap.SeenFlag}
	ids, err := c.Search(criteria)
	if err != nil {
		return 0, fmt.Errorf("failed to search unread emails: %w", err)
	}

	return len(ids), nil
}

func (s *service) GetRecentEmails(ctx context.Context, limit int) ([]EmailInfo, error) {
	// 1. Connect to IMAP server
	c, err := client.DialTLS(s.conf.IMAPServer, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to IMAP: %w", err)
	}
	defer c.Logout()

	// 2. Login
	cleanPassword := strings.ReplaceAll(s.conf.Password, " ", "")
	if err := c.Login(s.conf.User, cleanPassword); err != nil {
		return nil, fmt.Errorf("failed to login to IMAP: %w", err)
	}

	// 3. Select INBOX
	mbox, err := c.Select("INBOX", true)
	if err != nil {
		return nil, fmt.Errorf("failed to select INBOX: %w", err)
	}

	if mbox.Messages == 0 {
		return []EmailInfo{}, nil
	}

	// 4. Get the latest 'limit' email IDs (sequence numbers 1 to N)
	from := uint32(1)
	if mbox.Messages > uint32(limit) {
		from = mbox.Messages - uint32(limit) + 1
	}
	to := mbox.Messages

	seqset := new(imap.SeqSet)
	seqset.AddRange(from, to)

	// Fetch envelope (contains Subject, From, Date)
	items := []imap.FetchItem{imap.FetchEnvelope}
	messages := make(chan *imap.Message, limit)
	done := make(chan error, 1)
	go func() {
		done <- c.Fetch(seqset, items, messages)
	}()

	var results []EmailInfo
	for msg := range messages {
		results = append(results, EmailInfo{
			ID:        msg.SeqNum,
			Subject:   msg.Envelope.Subject,
			From:      msg.Envelope.From[0].PersonalName,
			Date:      msg.Envelope.Date.Format("15:04 02/01"),
			DetailAPI: fmt.Sprintf("/api/admin/google/email/%d", msg.SeqNum),
		})
	}

	if err := <-done; err != nil {
		return nil, fmt.Errorf("failed to fetch email details: %w", err)
	}

	// Reverse to get newest first
	for i, j := 0, len(results)-1; i < j; i, j = i+1, j-1 {
		results[i], results[j] = results[j], results[i]
	}

	return results, nil
}

func (s *service) GetUnreadEmails(ctx context.Context, limit int) ([]EmailInfo, error) {
	// 1. Connect
	c, err := client.DialTLS(s.conf.IMAPServer, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to connect: %w", err)
	}
	defer c.Logout()

	// 2. Login
	cleanPassword := strings.ReplaceAll(s.conf.Password, " ", "")
	if err := c.Login(s.conf.User, cleanPassword); err != nil {
		return nil, fmt.Errorf("failed to login: %w", err)
	}

	// 3. Select INBOX
	mbox, err := c.Select("INBOX", true)
	if err != nil {
		return nil, fmt.Errorf("failed to select: %w", err)
	}

	if mbox.Messages == 0 {
		return []EmailInfo{}, nil
	}

	// 4. Search for UNSEEN
	criteria := imap.NewSearchCriteria()
	criteria.WithoutFlags = []string{imap.SeenFlag}
	ids, err := c.Search(criteria)
	if err != nil {
		return nil, fmt.Errorf("failed to search: %w", err)
	}

	if len(ids) == 0 {
		return []EmailInfo{}, nil
	}

	// 5. Take the last 'limit'
	if len(ids) > limit {
		ids = ids[len(ids)-limit:]
	}

	seqset := new(imap.SeqSet)
	for _, id := range ids {
		seqset.AddNum(id)
	}

	// Fetch envelopes
	items := []imap.FetchItem{imap.FetchEnvelope}
	messages := make(chan *imap.Message, len(ids))
	done := make(chan error, 1)
	go func() {
		done <- c.Fetch(seqset, items, messages)
	}()

	var results []EmailInfo
	for msg := range messages {
		results = append(results, EmailInfo{
			ID:        msg.SeqNum,
			Subject:   msg.Envelope.Subject,
			From:      msg.Envelope.From[0].PersonalName,
			Date:      msg.Envelope.Date.Format("15:04 02/01"),
			DetailAPI: fmt.Sprintf("/api/admin/google/email/%d", msg.SeqNum),
		})
	}

	if err := <-done; err != nil {
		return nil, fmt.Errorf("failed to fetch details: %w", err)
	}

	// Reverse to get newest first
	for i, j := 0, len(results)-1; i < j; i, j = i+1, j-1 {
		results[i], results[j] = results[j], results[i]
	}

	return results, nil
}

func (s *service) ReadEmailByTitle(ctx context.Context, title string) (*EmailDetail, error) {
	// 1. Connect
	c, err := client.DialTLS(s.conf.IMAPServer, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to IMAP: %w", err)
	}
	defer c.Logout()

	// 2. Login
	cleanPassword := strings.ReplaceAll(s.conf.Password, " ", "")
	if err := c.Login(s.conf.User, cleanPassword); err != nil {
		return nil, fmt.Errorf("failed to login to IMAP: %w", err)
	}

	// 3. Select INBOX
	mbox, err := c.Select("INBOX", true)
	if err != nil {
		return nil, fmt.Errorf("failed to select INBOX: %w", err)
	}

	if mbox.Messages == 0 {
		return nil, fmt.Errorf("inbox is empty")
	}

	// 4. Search recent emails (last 50 to find title match)
	limit := uint32(50)
	from := uint32(1)
	if mbox.Messages > limit {
		from = mbox.Messages - limit + 1
	}
	to := mbox.Messages

	seqset := new(imap.SeqSet)
	seqset.AddRange(from, to)

	// 5. Fetch envelopes to find the title match (pick the most recent)
	items := []imap.FetchItem{imap.FetchEnvelope}
	messages := make(chan *imap.Message, limit)
	done := make(chan error, 1)
	go func() {
		done <- c.Fetch(seqset, items, messages)
	}()

	var bestID uint32
	var bestEnvelope *imap.Envelope
	targetTitle := strings.ToLower(strings.TrimSpace(title))

	for msg := range messages {
		subject := strings.ToLower(msg.Envelope.Subject)
		if strings.Contains(subject, targetTitle) {
			// Newer emails have higher sequence numbers
			if msg.SeqNum > bestID {
				bestID = msg.SeqNum
				bestEnvelope = msg.Envelope
			}
		}
	}
	if err := <-done; err != nil {
		return nil, fmt.Errorf("failed to fetch envelopes: %w", err)
	}

	if bestID == 0 {
		return nil, fmt.Errorf("không tìm thấy email nào gần đây có tiêu đề chứa '%s'", title)
	}

	// 6. Fetch full body of the best message
	seqset = new(imap.SeqSet)
	seqset.AddNum(bestID)
	var section imap.BodySectionName
	items = []imap.FetchItem{section.FetchItem()}
	messages = make(chan *imap.Message, 1)
	go func() {
		c.Fetch(seqset, items, messages)
	}()

	msg := <-messages
	if msg == nil {
		return nil, fmt.Errorf("failed to fetch message details")
	}
	r := msg.GetBody(&section)

	mr, err := mail.CreateReader(r)
	if err != nil {
		return nil, fmt.Errorf("failed to create mail reader: %w", err)
	}

	detail := &EmailDetail{
		ID:        bestID,
		Subject:   bestEnvelope.Subject,
		From:      bestEnvelope.From[0].PersonalName,
		Date:      bestEnvelope.Date.Format("15:04 02/01/2006"),
		Timestamp: bestEnvelope.Date.Unix(),
	}

	for {
		p, err := mr.NextPart()
		if err == io.EOF {
			break
		}
		if err != nil {
			break
		}

		switch h := p.Header.(type) {
		case *mail.InlineHeader:
			contentType, _, _ := h.ContentType()
			if strings.HasPrefix(contentType, "text/plain") {
				b, _ := io.ReadAll(p.Body)
				detail.Body = string(b)
			}
		case *mail.AttachmentHeader:
			filename, _ := h.Filename()
			// Save attachment
			safeName := fmt.Sprintf("%d_%s", bestID, filename)
			savePath := filepath.Join("public", "attachments", safeName)
			f, err := os.Create(savePath)
			if err == nil {
				io.Copy(f, p.Body)
				f.Close()
				detail.Attachments = append(detail.Attachments, Attachment{
					ID:       uint32(len(detail.Attachments) + 1),
					Filename: filename,
					URL:      "/public/attachments/" + safeName,
				})
			}
		}
	}

	return detail, nil
}

func (s *service) ReadEmailByID(ctx context.Context, id uint32) (*EmailDetail, error) {
	// 1. Connect
	c, err := client.DialTLS(s.conf.IMAPServer, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to IMAP: %w", err)
	}
	defer c.Logout()

	// 2. Login
	cleanPassword := strings.ReplaceAll(s.conf.Password, " ", "")
	if err := c.Login(s.conf.User, cleanPassword); err != nil {
		return nil, fmt.Errorf("failed to login to IMAP: %w", err)
	}

	// 3. Select INBOX (Read-Write to allow marking as seen)
	_, err = c.Select("INBOX", false)
	if err != nil {
		return nil, fmt.Errorf("failed to select INBOX: %w", err)
	}

	// 4. Fetch the specific message by sequence ID
	seqset := new(imap.SeqSet)
	seqset.AddNum(id)

	// Fetch envelope and body
	var section imap.BodySectionName
	items := []imap.FetchItem{imap.FetchEnvelope, section.FetchItem()}
	messages := make(chan *imap.Message, 1)
	done := make(chan error, 1)
	go func() {
		done <- c.Fetch(seqset, items, messages)
	}()

	msg := <-messages
	if msg == nil {
		return nil, fmt.Errorf("email với ID %d không tìm thấy", id)
	}
	if err := <-done; err != nil {
		return nil, fmt.Errorf("failed to fetch email: %w", err)
	}

	// Mark as read
	if err := c.Store(seqset, imap.FormatFlagsOp(imap.AddFlags, true), []interface{}{imap.SeenFlag}, nil); err != nil {
		fmt.Printf("Warning: failed to mark email %d as read: %v\n", id, err)
	}

	r := msg.GetBody(&section)
	mr, err := mail.CreateReader(r)
	if err != nil {
		return nil, fmt.Errorf("failed to create mail reader: %w", err)
	}

	detail := &EmailDetail{
		ID:        id,
		Subject:   msg.Envelope.Subject,
		From:      msg.Envelope.From[0].PersonalName,
		Date:      msg.Envelope.Date.Format("15:04 02/01/2006"),
		Timestamp: msg.Envelope.Date.Unix(),
	}

	for {
		p, err := mr.NextPart()
		if err == io.EOF {
			break
		}
		if err != nil {
			break
		}

		switch h := p.Header.(type) {
		case *mail.InlineHeader:
			contentType, _, _ := h.ContentType()
			if strings.HasPrefix(contentType, "text/plain") {
				b, _ := io.ReadAll(p.Body)
				detail.Body = string(b)
			}
		case *mail.AttachmentHeader:
			filename, _ := h.Filename()
			safeName := fmt.Sprintf("%d_%s", id, filename)
			savePath := filepath.Join("public", "attachments", safeName)
			f, err := os.Create(savePath)
			if err == nil {
				io.Copy(f, p.Body)
				f.Close()
				detail.Attachments = append(detail.Attachments, Attachment{
					ID:       uint32(len(detail.Attachments) + 1),
					Filename: filename,
					URL:      "/public/attachments/" + safeName,
				})
			}
		}
	}

	return detail, nil
}

func (s *service) GetLatestEmailByFilter(ctx context.Context) (*EmailInfo, error) {
	// 1. Connect to IMAP server
	c, err := client.DialTLS(s.conf.IMAPServer, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to IMAP: %w", err)
	}
	defer c.Logout()

	// 2. Login
	cleanPassword := strings.ReplaceAll(s.conf.Password, " ", "")
	if err := c.Login(s.conf.User, cleanPassword); err != nil {
		return nil, fmt.Errorf("failed to login to IMAP: %w", err)
	}

	// 3. Select INBOX
	_, err = c.Select("INBOX", true)
	if err != nil {
		return nil, fmt.Errorf("failed to select INBOX: %w", err)
	}

	// 4. Search for emails from the specified sender
	criteria := imap.NewSearchCriteria()
	criteria.Header.Set("From", s.conf.FromFilter)
	ids, err := c.Search(criteria)
	if err != nil {
		return nil, fmt.Errorf("failed to search emails: %w", err)
	}

	if len(ids) == 0 {
		return nil, fmt.Errorf("no emails found from %s", s.conf.FromFilter)
	}

	// 5. Get the latest email ID
	latestID := ids[len(ids)-1]
	seqset := new(imap.SeqSet)
	seqset.AddNum(latestID)

	// Fetch envelope
	items := []imap.FetchItem{imap.FetchEnvelope}
	messages := make(chan *imap.Message, 1)
	done := make(chan error, 1)
	go func() {
		done <- c.Fetch(seqset, items, messages)
	}()

	msg := <-messages
	if msg == nil {
		return nil, fmt.Errorf("message not found")
	}
	if err := <-done; err != nil {
		return nil, fmt.Errorf("failed to fetch message: %w", err)
	}

	return &EmailInfo{
		ID:        msg.SeqNum,
		Subject:   msg.Envelope.Subject,
		From:      msg.Envelope.From[0].PersonalName,
		Date:      msg.Envelope.Date.Format("15:04 02/01"),
		DetailAPI: fmt.Sprintf("/api/admin/google/email/%d", msg.SeqNum),
	}, nil
}

func CreateAdvancedCriteria(include []string, exclude []string, from string) *imap.SearchCriteria {
	var root *imap.SearchCriteria

	// 1. Xử lý phần INCLUDE (OR logic)
	if len(include) > 0 {
		root = buildRecursiveOr(include)
	} else {
		root = imap.NewSearchCriteria()
	}

	// 2. Xử lý phần FROM (Phải khớp với From VÀ khớp với cụm OR ở trên)
	if from != "" {
		root.Header.Set("From", from)
	}

	// 3. Xử lý phần EXCLUDE (Loại trừ - NOT logic)
	for _, word := range exclude {
		notCrit := imap.NewSearchCriteria()
		notCrit.Text = []string{word}
		root.Not = append(root.Not, notCrit)
	}

	return root
}

// Hàm đệ quy để build cấu trúc OR lồng nhau chuẩn IMAP
func buildRecursiveOr(keywords []string) *imap.SearchCriteria {
	if len(keywords) == 1 {
		c := imap.NewSearchCriteria()
		c.Text = []string{keywords[0]}
		return c
	}

	curr := imap.NewSearchCriteria()
	curr.Text = []string{keywords[0]}

	parent := imap.NewSearchCriteria()
	parent.Or = [][2]*imap.SearchCriteria{
		{curr, buildRecursiveOr(keywords[1:])},
	}
	return parent
}

func (s *service) GetLatestEmailAttachmentPage1(ctx context.Context) (string, error) {
	// 1. Connect to IMAP server
	c, err := client.DialTLS(s.conf.IMAPServer, nil)
	if err != nil {
		return "", fmt.Errorf("failed to connect to IMAP: %w", err)
	}
	defer c.Logout()

	// 2. Login
	cleanPassword := strings.ReplaceAll(s.conf.Password, " ", "")
	if err := c.Login(s.conf.User, cleanPassword); err != nil {
		return "", fmt.Errorf("failed to login to IMAP: %w", err)
	}

	// 3. Select INBOX
	mbox, err := c.Select("INBOX", true)
	if err != nil {
		return "", fmt.Errorf("failed to select INBOX: %w", err)
	}

	if mbox.Messages == 0 {
		return "No emails found in INBOX", nil
	}

	// 4. Search for emails from the specified sender
	includeWords := []string{"mưa", "thời tiết", "Bản tin"}
	excludeWords := []string{"THỦY VĂN", "CẢNH BÁO THUỶ VĂN"} // Ví dụ từ muốn loại bỏ

	criteria := CreateAdvancedCriteria(includeWords, excludeWords, s.conf.FromFilter)
	ids, err := c.Search(criteria)
	if err == nil {
		sort.Slice(ids, func(i, j int) bool { return ids[i] < ids[j] })
	}
	fmt.Println("====================== ", ids, err)
	if err != nil {
		return "", fmt.Errorf("failed to search emails: %w", err)
	}

	// 5. Get Subjects for debugging
	if len(ids) > 0 {
		seqset := new(imap.SeqSet)
		seqset.AddNum(ids...)
		items := []imap.FetchItem{imap.FetchEnvelope}
		messages := make(chan *imap.Message, len(ids))
		done := make(chan error, 1)
		go func() {
			// Note: c.Fetch closes the messages channel when done
			done <- c.Fetch(seqset, items, messages)
		}()

		fmt.Println("Found emails:")
		for msg := range messages {
			fmt.Printf("  ID: %d - Subject: %s\n", msg.SeqNum, msg.Envelope.Subject)
		}
		if err := <-done; err != nil {
			fmt.Printf("Warning: failed to fetch envelopes: %v\n", err)
		}
	}

	// 6. Try the last few emails to find one with readable content
	numToTry := 3
	if len(ids) < numToTry {
		numToTry = len(ids)
	}

	for i := 0; i < numToTry; i++ {
		latestID := ids[len(ids)-1-i]
		fmt.Printf("DEBUG: Trying email ID %d (%d/%d)\n", latestID, i+1, numToTry)
		content, _, _, err := s.fetchAndParseEmailExtended(c, latestID, false)
		if err == nil && content != "" && !strings.Contains(content, "No attachment found") {
			return content, nil
		}
		fmt.Printf("DEBUG: Email %d yield no usable content: %v\n", latestID, err)
	}

	return "", fmt.Errorf("no readable weather report found in the latest emails")
}

func (s *service) GetLatestWeatherEmailID(ctx context.Context) (uint32, error) {
	c, err := s.connectIMAP()
	if err != nil {
		return 0, err
	}
	defer c.Logout()

	_, err = c.Select("INBOX", true)
	if err != nil {
		return 0, err
	}

	includeWords := []string{"mưa", "thời tiết", "Bản tin"}
	excludeWords := []string{"THỦY VĂN", "CẢNH BÁO THUỶ VĂN"}

	criteria := CreateAdvancedCriteria(includeWords, excludeWords, s.conf.FromFilter)
	ids, err := c.Search(criteria)
	if err != nil {
		return 0, err
	}
	sort.Slice(ids, func(i, j int) bool { return ids[i] < ids[j] })

	if len(ids) == 0 {
		return 0, fmt.Errorf("no matching weather emails found")
	}

	return ids[len(ids)-1], nil
}

func (s *service) GetEmailAttachmentRawByID(ctx context.Context, id uint32) ([]byte, string, error) {
	c, err := s.connectIMAP()
	if err != nil {
		return nil, "", err
	}
	defer c.Logout()

	_, err = c.Select("INBOX", true)
	if err != nil {
		return nil, "", err
	}

	_, raw, filename, err := s.fetchAndParseEmailExtended(c, id, true)
	if err != nil {
		return nil, "", fmt.Errorf("failed to fetch email %d: %w", id, err)
	}
	if len(raw) == 0 {
		return nil, "", fmt.Errorf("email %d has no PDF attachment", id)
	}

	return raw, filename, nil
}

func (s *service) GetLatestEmailAttachmentRaw(ctx context.Context) ([]byte, string, error) {
	id, err := s.GetLatestWeatherEmailID(ctx)
	if err != nil {
		return nil, "", err
	}
	return s.GetEmailAttachmentRawByID(ctx, id)
}

func (s *service) fetchAndParseEmailExtended(c *client.Client, id uint32, returnRaw bool) (string, []byte, string, error) {
	seqset := new(imap.SeqSet)
	seqset.AddNum(id)

	var section imap.BodySectionName
	items := []imap.FetchItem{section.FetchItem()}

	messages := make(chan *imap.Message, 1)
	done := make(chan error, 1)
	go func() {
		done <- c.Fetch(seqset, items, messages)
	}()

	msg := <-messages
	if msg == nil {
		return "", nil, "", fmt.Errorf("message not found")
	}
	if err := <-done; err != nil {
		return "", nil, "", fmt.Errorf("failed to fetch message: %w", err)
	}

	r := msg.GetBody(&section)
	if r == nil {
		return "", nil, "", fmt.Errorf("message body not found")
	}

	mr, err := mail.CreateReader(r)
	if err != nil {
		return "", nil, "", fmt.Errorf("failed to create mail reader: %w", err)
	}

	var emailBody string
	var htmlBody string
	for {
		p, err := mr.NextPart()
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", nil, "", fmt.Errorf("failed to read next part: %w", err)
		}

		cType := p.Header.Get("Content-Type")
		switch h := p.Header.(type) {
		case *mail.AttachmentHeader:
			filename, _ := h.Filename()
			lowerName := strings.ToLower(filename)
			if strings.HasSuffix(lowerName, ".pdf") || strings.Contains(strings.ToLower(cType), "application/pdf") {
				if returnRaw {
					b, err := io.ReadAll(p.Body)
					return "", b, filename, err
				}
				pdfText, err := s.extractTextFromPDF(p.Body, 1) // Only page 1
				if err == nil && pdfText != "" {
					return pdfText, nil, "", nil
				}
			}
		case *mail.InlineHeader:
			if strings.Contains(strings.ToLower(cType), "application/pdf") {
				if returnRaw {
					b, err := io.ReadAll(p.Body)
					return "", b, "inline.pdf", err
				}
				pdfText, err := s.extractTextFromPDF(p.Body, 1) // Only page 1
				if err == nil && pdfText != "" {
					return pdfText, nil, "", nil
				}
			}
			if strings.Contains(cType, "text/plain") {
				b, _ := io.ReadAll(p.Body)
				emailBody += string(b)
			} else if strings.Contains(cType, "text/html") {
				b, _ := io.ReadAll(p.Body)
				htmlBody += string(b)
			}
		default:
			if strings.Contains(strings.ToLower(cType), "application/pdf") {
				if returnRaw {
					b, err := io.ReadAll(p.Body)
					return "", b, "attachment.pdf", err
				}
				pdfText, err := s.extractTextFromPDF(p.Body, 1) // Only page 1
				if err == nil && pdfText != "" {
					return pdfText, nil, "", nil
				}
			}
		}
	}

	if emailBody != "" {
		return s.cleanExtractedText(emailBody), nil, "", nil
	}
	if htmlBody != "" {
		return s.cleanExtractedText(stripHTML(htmlBody)), nil, "", nil
	}

	return "", nil, "", nil
}

func stripHTML(html string) string {
	// Simple regex-less HTML stripper for basic report content
	var buf bytes.Buffer
	inTag := false
	for _, r := range html {
		if r == '<' {
			inTag = true
			continue
		}
		if r == '>' {
			inTag = false
			continue
		}
		if !inTag {
			buf.WriteRune(r)
		}
	}
	return buf.String()
}

func (s *service) DownloadAttachment(ctx context.Context, emailID uint32, attachmentID uint32) ([]byte, error) {
	c, err := s.connectIMAP()
	if err != nil {
		return nil, err
	}
	defer c.Logout()

	_, err = c.Select("INBOX", true)
	if err != nil {
		return nil, err
	}

	seqset := new(imap.SeqSet)
	seqset.AddNum(emailID)

	var section imap.BodySectionName
	items := []imap.FetchItem{section.FetchItem()}
	messages := make(chan *imap.Message, 1)
	done := make(chan error, 1)
	go func() {
		done <- c.Fetch(seqset, items, messages)
	}()

	msg := <-messages
	if msg == nil {
		return nil, fmt.Errorf("message %d not found", emailID)
	}

	r := msg.GetBody(&section)
	mr, err := mail.CreateReader(r)
	if err != nil {
		return nil, err
	}

	currentID := uint32(0)
	for {
		p, err := mr.NextPart()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}

		switch p.Header.(type) {
		case *mail.AttachmentHeader:
			currentID++
			if currentID == attachmentID {
				return io.ReadAll(p.Body)
			}
		}
	}

	return nil, fmt.Errorf("attachment %d not found in email %d", attachmentID, emailID)
}
