package email

import (
	"github.com/emersion/go-imap"
)

func CreateAdvancedCriteria(include []string, exclude []string, from string) *imap.SearchCriteria {
	var root *imap.SearchCriteria

	if len(include) > 0 {
		root = buildRecursiveOr(include)
	} else {
		root = imap.NewSearchCriteria()
	}

	if from != "" {
		root.Header.Set("From", from)
	}

	for _, word := range exclude {
		notCrit := imap.NewSearchCriteria()
		notCrit.Text = []string{word}
		root.Not = append(root.Not, notCrit)
	}

	return root
}

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
