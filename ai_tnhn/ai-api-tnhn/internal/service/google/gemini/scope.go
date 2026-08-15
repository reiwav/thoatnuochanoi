package gemini

import (
	"context"
)

// dataScope is the resolved data-visibility envelope for one chat request.
//
// It is the single place that answers "how much of the system may this user
// see?", so every tool handler reads the same answer instead of re-deriving it.
//
// The two rules it encodes:
//   - IsAllowedAll => the caller may read the whole city; OrgID is cleared.
//   - otherwise    => the caller is confined to OrgID plus the station IDs
//     explicitly assigned to them (permission-based scoping).
type dataScope struct {
	// OrgID confines queries to one organisation. "" means city-wide.
	OrgID string
	// IsAllowedAll grants city-wide visibility regardless of assignment.
	IsAllowedAll bool

	RainIDs       []string
	LakeIDs       []string
	RiverIDs      []string
	InundationIDs []string
	// PumpingIDs and SluiceGateIDs wrap the single-valued assignment fields on
	// models.User into slices, because the station services take slices.
	PumpingIDs    []string
	SluiceGateIDs []string

	// UserID is carried through for tools that record who acted (e.g. emergency
	// progress reports).
	UserID string
}

// resolveScope loads the acting user and derives their data scope. A missing or
// unreadable user yields a zero scope, i.e. no org and no assignments.
func (s *service) resolveScope(ctx context.Context, userID string, isCompany bool) dataScope {
	scope := dataScope{UserID: userID}

	u, _ := s.userRepo.GetByID(ctx, userID)
	if u == nil {
		// Unknown user: keep OrgID empty and grant only what isCompany allows,
		// matching the previous inline behaviour.
		scope.IsAllowedAll = isCompany
		return scope
	}

	scope.OrgID = u.OrgID
	if isCompany {
		scope.OrgID = ""
	}

	scope.RainIDs = u.AssignedRainStationIDs
	scope.LakeIDs = u.AssignedLakeStationIDs
	scope.RiverIDs = u.AssignedRiverStationIDs
	scope.InundationIDs = u.AssignedInundationStationIDs

	if u.AssignedPumpingStationID != "" {
		scope.PumpingIDs = []string{u.AssignedPumpingStationID}
	}
	if u.AssignedSluiceGateID != "" {
		scope.SluiceGateIDs = []string{u.AssignedSluiceGateID}
	}

	// TODO(B1): these two role literals never match a stored role. handler/auth.go
	// normalises roles to snake_case ("super_admin", "giam_doc_xi_nghiep", ...),
	// so the effective rule today is just isCompany. Task B1 replaces them with
	// constant.ROLE_SUPER_ADMIN to match internal/service/station/inundation/
	// helper.go:194, which is the repo-wide form of this check.
	scope.IsAllowedAll = isCompany || u.Role == "Super Admin" || u.Role == "Manager"

	return scope
}

// waterIDs returns the lake and river assignments combined, which is the shape
// the water summary service expects.
func (d dataScope) waterIDs() []string {
	return append(d.LakeIDs, d.RiverIDs...)
}
