package gemini

import (
	"context"
	"errors"
	"reflect"
	"testing"

	"ai-api-tnhn/internal/constant"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
)

// fakeUserRepo implements only GetByID. The embedded interface satisfies the
// rest of repository.User (including mgo.BaseTable) without hand-writing ~30
// unused methods; any accidental call would panic and fail the test loudly.
type fakeUserRepo struct {
	repository.User
	user *models.User
	err  error
}

func (f *fakeUserRepo) GetByID(ctx context.Context, id string) (*models.User, error) {
	return f.user, f.err
}

func newScopeService(u *models.User, err error) *service {
	return &service{userRepo: &fakeUserRepo{user: u, err: err}}
}

func TestResolveScope(t *testing.T) {
	tests := []struct {
		name      string
		user      *models.User
		repoErr   error
		isCompany bool
		want      dataScope
	}{
		{
			name: "company user gets city-wide scope and org is cleared",
			user: &models.User{
				OrgID: "org-1", Role: "chu_tich_cty",
				AssignedRainStationIDs: []string{"r1"},
			},
			isCompany: true,
			want: dataScope{
				OrgID: "", IsAllowedAll: true,
				RainIDs: []string{"r1"},
				UserID:  "u-1",
			},
		},
		{
			// super_admin grants city-wide access on the role alone, without
			// depending on the is_company flag being set on the role record.
			name: "super_admin gets city-wide scope and org is cleared",
			user: &models.User{
				OrgID: "org-1", Role: constant.ROLE_SUPER_ADMIN,
			},
			isCompany: false,
			want: dataScope{
				OrgID: "", IsAllowedAll: true,
				UserID: "u-1",
			},
		},
		{
			name: "org director stays confined to their org",
			user: &models.User{
				OrgID: "org-7", Role: "giam_doc_xi_nghiep",
			},
			isCompany: false,
			want: dataScope{
				OrgID: "org-7", IsAllowedAll: false,
				UserID: "u-1",
			},
		},
		{
			name: "employee assignments propagate and scalars become slices",
			user: &models.User{
				OrgID: "org-2", Role: "cong_nhan_cty",
				AssignedRainStationIDs:       []string{"r1", "r2"},
				AssignedLakeStationIDs:       []string{"l1"},
				AssignedRiverStationIDs:      []string{"rv1"},
				AssignedInundationStationIDs: []string{"i1", "i2"},
				AssignedPumpingStationID:     "p1",
				AssignedSluiceGateID:         "g1",
			},
			isCompany: false,
			want: dataScope{
				OrgID: "org-2", IsAllowedAll: false,
				RainIDs:       []string{"r1", "r2"},
				LakeIDs:       []string{"l1"},
				RiverIDs:      []string{"rv1"},
				InundationIDs: []string{"i1", "i2"},
				PumpingIDs:    []string{"p1"},
				SluiceGateIDs: []string{"g1"},
				UserID:        "u-1",
			},
		},
		{
			name:      "empty scalar assignments stay nil rather than [\"\"]",
			user:      &models.User{OrgID: "org-3", AssignedPumpingStationID: "", AssignedSluiceGateID: ""},
			isCompany: false,
			want:      dataScope{OrgID: "org-3", UserID: "u-1"},
		},
		{
			name:      "unknown user yields empty scope, isCompany still honoured",
			user:      nil,
			isCompany: true,
			want:      dataScope{OrgID: "", IsAllowedAll: true, UserID: "u-1"},
		},
		{
			name:      "repo error is treated as unknown user",
			user:      nil,
			repoErr:   errors.New("db down"),
			isCompany: false,
			want:      dataScope{OrgID: "", IsAllowedAll: false, UserID: "u-1"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := newScopeService(tt.user, tt.repoErr)
			got := s.resolveScope(context.Background(), "u-1", tt.isCompany)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("resolveScope mismatch\n got: %+v\nwant: %+v", got, tt.want)
			}
		})
	}
}

// TestResolveScopeIgnoresDisplayRoles guards against reintroducing display-name
// role checks. Roles are stored snake_case, so these values can only ever come
// from a hardcoded string and must not grant access.
func TestResolveScopeIgnoresDisplayRoles(t *testing.T) {
	for _, role := range []string{"Super Admin", "Manager", "super admin", "SUPER_ADMIN"} {
		s := newScopeService(&models.User{OrgID: "org-1", Role: role}, nil)
		got := s.resolveScope(context.Background(), "u-1", false)
		if got.IsAllowedAll {
			t.Errorf("role %q must not grant IsAllowedAll; only %q does", role, constant.ROLE_SUPER_ADMIN)
		}
		if got.OrgID != "org-1" {
			t.Errorf("role %q should stay org-scoped, got OrgID %q", role, got.OrgID)
		}
	}
}

// TestResolveScopeInvariant guards the coupling between the two fields that
// widen access. The org-scoped tools (rain, water, pumping, system overview)
// read OrgID while the inundation tools read IsAllowedAll, so a scope that is
// city-wide by one measure and org-confined by the other would answer the same
// question differently depending on which tool the model picked.
func TestResolveScopeInvariant(t *testing.T) {
	users := []*models.User{
		{OrgID: "org-1", Role: constant.ROLE_SUPER_ADMIN},
		{OrgID: "org-1", Role: "chu_tich_cty"},
		{OrgID: "org-1", Role: "giam_doc_xi_nghiep"},
		{OrgID: "", Role: "cong_nhan_cty"},
	}
	for _, u := range users {
		for _, isCompany := range []bool{true, false} {
			s := newScopeService(u, nil)
			got := s.resolveScope(context.Background(), "u-1", isCompany)
			if got.IsAllowedAll && got.OrgID != "" {
				t.Errorf("role=%q isCompany=%v: IsAllowedAll with OrgID %q still set",
					u.Role, isCompany, got.OrgID)
			}
		}
	}
}

func TestDataScopeWaterIDs(t *testing.T) {
	d := dataScope{LakeIDs: []string{"l1", "l2"}, RiverIDs: []string{"rv1"}}
	want := []string{"l1", "l2", "rv1"}
	if got := d.waterIDs(); !reflect.DeepEqual(got, want) {
		t.Errorf("waterIDs() = %v, want %v", got, want)
	}

	// Both empty must stay nil so downstream services see "no assignment"
	// rather than an empty-but-non-nil filter.
	if got := (dataScope{}).waterIDs(); got != nil {
		t.Errorf("waterIDs() on empty scope = %v, want nil", got)
	}
}
