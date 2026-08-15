package gemini

import (
	"context"
	"errors"
	"reflect"
	"testing"

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
			// Documents the pre-B1 state: the stored role is snake_case, so the
			// "Super Admin"/"Manager" literals never match and a super_admin who
			// is not flagged is_company stays org-scoped. Task B1 flips this.
			name: "TODO(B1) snake_case super_admin does NOT yet grant city-wide",
			user: &models.User{
				OrgID: "org-1", Role: "super_admin",
			},
			isCompany: false,
			want: dataScope{
				OrgID: "org-1", IsAllowedAll: false,
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

// TestResolveScopeLegacyDisplayRoles pins the two literals that are still in
// place before Task B1, so the B1 commit shows exactly what changes.
func TestResolveScopeLegacyDisplayRoles(t *testing.T) {
	for _, role := range []string{"Super Admin", "Manager"} {
		s := newScopeService(&models.User{OrgID: "org-1", Role: role}, nil)
		got := s.resolveScope(context.Background(), "u-1", false)
		if !got.IsAllowedAll {
			t.Errorf("role %q should currently grant IsAllowedAll", role)
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
