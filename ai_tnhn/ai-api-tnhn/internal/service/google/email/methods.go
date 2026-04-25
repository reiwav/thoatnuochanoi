package email

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/emersion/go-imap"
	"github.com/emersion/go-imap/client"
	"github.com/emersion/go-message/mail"
)

func (s *service) connectIMAP() (*client.Client, error) {
	c, err := client.DialTLS(s.conf.IMAPServer, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to IMAP: %w", err)
	}

	cleanPassword := strings.ReplaceAll(s.conf.Password, " ", "")
	if err := c.Login(s.conf.User, cleanPassword); err != nil {
		c.Logout()
		return nil, fmt.Errorf("failed to login to IMAP: %w", err)
	}
	return c, nil
}

func (s *service) GetLatestRainWarning(ctx context.Context) (string, error) {
	c, err := s.connectIMAP()
	if err != nil {
		return "", err
	}
	defer c.Logout()

	mbox, err := c.Select("INBOX", false)
	if err != nil {
		return "", fmt.Errorf("failed to select INBOX: %w", err)
	}

	if mbox.Messages == 0 {
		return "No emails found in INBOX", nil
	}

	criteria := imap.NewSearchCriteria()
	criteria.Header.Set("From", s.conf.FromFilter)
	ids, err := c.Search(criteria)
	if err != nil {
		return "", fmt.Errorf("failed to search emails: %w", err)
	}

	if len(ids) == 0 {
		return "No emails found from " + s.conf.FromFilter, nil
	}

	latestID := ids[len(ids)-1]
	seqset := new(imap.SeqSet)
	seqset.AddNum(latestID)

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
				return s.extractTextFromPDF(p.Body, 0)
			}
			if strings.HasSuffix(lowerName, ".docx") {
				return s.extractTextFromDocx(p.Body)
			}
			if strings.HasSuffix(lowerName, ".xlsx") {
				return s.extractTextFromXlsx(p.Body)
			}
		}
	}

	return "No suitable attachment found in the latest email", nil
}

func (s *service) GetUnreadCount(ctx context.Context) (int, error) {
	c, err := s.connectIMAP()
	if err != nil {
		return 0, err
	}
	defer c.Logout()

	_, err = c.Select("INBOX", true)
	if err != nil {
		return 0, fmt.Errorf("failed to select INBOX: %w", err)
	}

	criteria := imap.NewSearchCriteria()
	criteria.WithoutFlags = []string{imap.SeenFlag}
	ids, err := c.Search(criteria)
	if err != nil {
		return 0, fmt.Errorf("failed to search unread emails: %w", err)
	}

	return len(ids), nil
}

func (s *service) GetRecentEmails(ctx context.Context, limit int) ([]EmailInfo, error) {
	c, err := s.connectIMAP()
	if err != nil {
		return nil, err
	}
	defer c.Logout()

	mbox, err := c.Select("INBOX", true)
	if err != nil {
		return nil, fmt.Errorf("failed to select INBOX: %w", err)
	}

	if mbox.Messages == 0 {
		return []EmailInfo{}, nil
	}

	from := uint32(1)
	if mbox.Messages > uint32(limit) {
		from = mbox.Messages - uint32(limit) + 1
	}
	to := mbox.Messages

	seqset := new(imap.SeqSet)
	seqset.AddRange(from, to)

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

	for i, j := 0, len(results)-1; i < j; i, j = i+1, j-1 {
		results[i], results[j] = results[j], results[i]
	}

	return results, nil
}

func (s *service) GetUnreadEmails(ctx context.Context, limit int) ([]EmailInfo, error) {
	c, err := s.connectIMAP()
	if err != nil {
		return nil, err
	}
	defer c.Logout()

	_, err = c.Select("INBOX", true)
	if err != nil {
		return nil, fmt.Errorf("failed to select: %w", err)
	}

	criteria := imap.NewSearchCriteria()
	criteria.WithoutFlags = []string{imap.SeenFlag}
	ids, err := c.Search(criteria)
	if err != nil {
		return nil, fmt.Errorf("failed to search: %w", err)
	}

	if len(ids) == 0 {
		return []EmailInfo{}, nil
	}

	if len(ids) > limit {
		ids = ids[len(ids)-limit:]
	}

	seqset := new(imap.SeqSet)
	for _, id := range ids {
		seqset.AddNum(id)
	}

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

	for i, j := 0, len(results)-1; i < j; i, j = i+1, j-1 {
		results[i], results[j] = results[j], results[i]
	}

	return results, nil
}

func (s *service) ReadEmailByTitle(ctx context.Context, title string) (*EmailDetail, error) {
	c, err := s.connectIMAP()
	if err != nil {
		return nil, err
	}
	defer c.Logout()

	mbox, err := c.Select("INBOX", true)
	if err != nil {
		return nil, fmt.Errorf("failed to select INBOX: %w", err)
	}

	if mbox.Messages == 0 {
		return nil, fmt.Errorf("inbox is empty")
	}

	limit := uint32(50)
	from := uint32(1)
	if mbox.Messages > limit {
		from = mbox.Messages - limit + 1
	}
	to := mbox.Messages

	seqset := new(imap.SeqSet)
	seqset.AddRange(from, to)

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
			safeName := fmt.Sprintf("%d_%s", bestID, filename)
			savePath := filepath.Join("public", "attachments", safeName)
			_ = os.MkdirAll("public/attachments", 0755)
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
	c, err := s.connectIMAP()
	if err != nil {
		return nil, err
	}
	defer c.Logout()

	_, err = c.Select("INBOX", false)
	if err != nil {
		return nil, fmt.Errorf("failed to select INBOX: %w", err)
	}

	seqset := new(imap.SeqSet)
	seqset.AddNum(id)

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

	_ = c.Store(seqset, imap.FormatFlagsOp(imap.AddFlags, true), []interface{}{imap.SeenFlag}, nil)

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
			_ = os.MkdirAll("public/attachments", 0755)
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
	c, err := s.connectIMAP()
	if err != nil {
		return nil, err
	}
	defer c.Logout()

	_, err = c.Select("INBOX", true)
	if err != nil {
		return nil, fmt.Errorf("failed to select INBOX: %w", err)
	}

	criteria := imap.NewSearchCriteria()
	criteria.Header.Set("From", s.conf.FromFilter)
	ids, err := c.Search(criteria)
	if err != nil {
		return nil, fmt.Errorf("failed to search emails: %w", err)
	}

	if len(ids) == 0 {
		return nil, fmt.Errorf("no emails found from %s", s.conf.FromFilter)
	}

	latestID := ids[len(ids)-1]
	seqset := new(imap.SeqSet)
	seqset.AddNum(latestID)

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
	c, err := s.connectIMAP()
	if err != nil {
		return "", err
	}
	defer c.Logout()

	mbox, err := c.Select("INBOX", true)
	if err != nil {
		return "", fmt.Errorf("failed to select INBOX: %w", err)
	}

	if mbox.Messages == 0 {
		return "No emails found in INBOX", nil
	}

	includeWords := []string{"mưa", "thời tiết", "Bản tin"}
	excludeWords := []string{"THỦY VĂN", "CẢNH BÁO THUỶ VĂN"}

	criteria := CreateAdvancedCriteria(includeWords, excludeWords, s.conf.FromFilter)
	ids, err := c.Search(criteria)
	if err == nil {
		sort.Slice(ids, func(i, j int) bool { return ids[i] < ids[j] })
	}
	if err != nil {
		return "", fmt.Errorf("failed to search emails: %w", err)
	}

	numToTry := 3
	if len(ids) < numToTry {
		numToTry = len(ids)
	}

	for i := 0; i < numToTry; i++ {
		latestID := ids[len(ids)-1-i]
		content, _, _, err := s.fetchAndParseEmailExtended(c, latestID, false)
		if err == nil && content != "" && !strings.Contains(content, "No attachment found") {
			return content, nil
		}
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
	return raw, filename, nil
}

func (s *service) GetLatestEmailAttachmentRaw(ctx context.Context) ([]byte, string, error) {
	id, err := s.GetLatestWeatherEmailID(ctx)
	if err != nil {
		return nil, "", err
	}
	return s.GetEmailAttachmentRawByID(ctx, id)
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
