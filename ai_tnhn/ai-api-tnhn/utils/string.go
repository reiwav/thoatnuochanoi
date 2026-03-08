package utils

func IntersectStrings(a, b []string) []string {
	m := make(map[string]bool)
	for _, x := range a {
		m[x] = true
	}
	var res []string
	for _, x := range b {
		if m[x] {
			res = append(res, x)
		}
	}
	return res
}
