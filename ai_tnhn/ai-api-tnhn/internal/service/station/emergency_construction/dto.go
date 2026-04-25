package emergency_construction

import "io"

type ImageContent struct {
	Name     string
	MimeType string
	Reader   io.Reader
}
