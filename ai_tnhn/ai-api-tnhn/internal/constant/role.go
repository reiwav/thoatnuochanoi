package constant

// Role codes as stored in the users collection.
//
// Roles are persisted snake_case (handler/auth.go normalises incoming values),
// so comparisons must use these constants rather than display strings like
// "Super Admin", which never match a stored role.
const (
	ROLE_SUPER_ADMIN = "super_admin"
)
