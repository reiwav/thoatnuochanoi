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
	Filename string `json:"filename"`
	URL      string `json:"url"`
}

type EmailDetail struct {
	Subject     string       `json:"subject"`
	From        string       `json:"from"`
	Date        string       `json:"date"`
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
	content, err := io.ReadAll(r)
	if err != nil {
		return "", fmt.Errorf("failed to read PDF content: %w", err)
	}

	readerAt := bytes.NewReader(content)
	pdfReader, err := pdf.NewReader(readerAt, int64(len(content)))
	if err != nil {
		return "", fmt.Errorf("failed to create PDF reader: %w", err)
	}

	var buf bytes.Buffer
	numPages := pdfReader.NumPage()
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
			return "", fmt.Errorf("failed to get text from page %d: %w", i, err)
		}
		buf.WriteString(text)
	}

	return s.cleanExtractedText(buf.String()), nil
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

func (s *service) GetUnreadCount(ctx context.Context) (int, error) {
	// 1. Connect to IMAP server
	c, err := client.DialTLS(s.conf.IMAPServer, nil)
	if err != nil {
		return 0, fmt.Errorf("failed to connect to IMAP: %w", err)
	}
	defer c.Logout()

	// 2. Login
	cleanPassword := strings.ReplaceAll(s.conf.Password, " ", "")
	if err := c.Login(s.conf.User, cleanPassword); err != nil {
		return 0, fmt.Errorf("failed to login to IMAP: %w", err)
	}

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
		Subject: bestEnvelope.Subject,
		From:    bestEnvelope.From[0].PersonalName,
		Date:    bestEnvelope.Date.Format("15:04 02/01/2006"),
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
		Subject: msg.Envelope.Subject,
		From:    msg.Envelope.From[0].PersonalName,
		Date:    msg.Envelope.Date.Format("15:04 02/01/2006"),
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
	criteria := imap.NewSearchCriteria()
	criteria.Header.Set("From", s.conf.FromFilter)
	criteria.Text = []string{"mưa"}
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
				return s.extractTextFromPDF(p.Body, 1) // LIMIT to PAGE 1
			}
			if strings.HasSuffix(lowerName, ".docx") {
				return s.extractTextFromDocx(p.Body)
			}
			if strings.HasSuffix(lowerName, ".xlsx") {
				return s.extractTextFromXlsx(p.Body)
			}
		}
	}

	return "No attachment found in the latest email", nil
}
