package filter

const (
	defaultPerPage = 50
	maxPerPage     = 200
)

type PaginationFilter struct {
	BasicFilter

	Page    int64 `json:"page" form:"page"`
	PerPage int64 `json:"per_page" form:"per_page"`
}

func NewPaginationFilter() *PaginationFilter {
	return &PaginationFilter{
		BasicFilter: *NewBasicFilter(),
	}
}

// implement repository.Filter interface
func (f *PaginationFilter) GetLimit() int64 {
	return f.GetPerPage() + 1
}

// implement repository.Filter interface
func (f *PaginationFilter) GetOffset() int64 {
	return (f.GetPage() - 1) * f.GetPerPage()
}

func (f *PaginationFilter) GetPage() int64 {
	if f.Page < 1 {
		return 1
	}
	return f.Page
}

func (f *PaginationFilter) GetPerPage() int64 {
	if f.PerPage < 1 || f.PerPage > maxPerPage {
		return defaultPerPage
	}

	return f.PerPage
}
