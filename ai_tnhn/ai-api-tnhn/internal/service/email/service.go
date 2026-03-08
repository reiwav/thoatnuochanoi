package email

import (
	"ai-api-tnhn/config"
	"bytes"
	"context"
	"fmt"
	"io"
	"strings"

	"github.com/emersion/go-imap"
	"github.com/emersion/go-imap/client"
	"github.com/emersion/go-message/mail"
	"github.com/ledongthuc/pdf"
)

type Service interface {
	GetLatestRainWarning(ctx context.Context) (string, error)
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
			if strings.HasSuffix(strings.ToLower(filename), ".pdf") {
				// 7. Extract text from PDF
				return s.extractTextFromPDF(p.Body)
			}
		}
	}

	return "No PDF attachment found in the latest email", nil
}

func (s *service) extractTextFromPDF(r io.Reader) (string, error) {
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
	for i := 1; i <= pdfReader.NumPage(); i++ {
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

	return buf.String(), nil
}
