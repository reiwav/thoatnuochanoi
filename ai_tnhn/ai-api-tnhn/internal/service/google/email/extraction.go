package email

import (
	"bytes"
	"fmt"
	"io"
	"regexp"
	"strings"

	"github.com/emersion/go-imap/client"
	"github.com/emersion/go-imap"
	"github.com/emersion/go-message/mail"
	"github.com/ledongthuc/pdf"
	"github.com/nguyenthenguyen/docx"
	"github.com/xuri/excelize/v2"
)

func (s *service) extractTextFromPDF(r io.Reader, pageLimit int) (string, error) {
	content, err := io.ReadAll(r)
	if err != nil {
		return "", fmt.Errorf("failed to read PDF body: %w", err)
	}
	contentLen := int64(len(content))
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
			continue
		}

		if text == "" {
			var fallbackBuf bytes.Buffer
			contentStruct := p.Content()
			for _, t := range contentStruct.Text {
				fallbackBuf.WriteString(t.S)
			}
			text = fallbackBuf.String()
		}

		buf.WriteString(text)
	}

	return s.cleanExtractedText(buf.String()), nil
}

func (s *service) cleanExtractedText(text string) string {
	re := regexp.MustCompile(`\n+`)
	text = re.ReplaceAllString(text, " ")
	re = regexp.MustCompile(`\s+`)
	text = re.ReplaceAllString(text, " ")
	text = strings.TrimSpace(text)

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
				pdfText, err := s.extractTextFromPDF(p.Body, 1)
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
				pdfText, err := s.extractTextFromPDF(p.Body, 1)
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
				pdfText, err := s.extractTextFromPDF(p.Body, 1)
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
