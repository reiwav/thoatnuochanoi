package googleapi

import (
	"context"
	"reflect"
	"testing"

	"ai-api-tnhn/internal/constant"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
)

// Only GetByID / GetByCode are exercised; the embedded interfaces cover the rest
// of repository.User and repository.Role so a stray call panics loudly instead
// of silently returning a zero value.
type fakeUserRepo struct {
	repository.User
	user *models.User
}

func (f *fakeUserRepo) GetByID(ctx context.Context, id string) (*models.User, error) {
	return f.user, nil
}

type fakeRoleRepo struct {
	repository.Role
	roles map[string]*models.Role
}

func (f *fakeRoleRepo) GetByCode(ctx context.Context, code string) (*models.Role, error) {
	return f.roles[code], nil
}

var testRoles = map[string]*models.Role{
	"chu_tich_cty":       {Code: "chu_tich_cty", IsCompany: true},
	"giam_doc_xi_nghiep": {Code: "giam_doc_xi_nghiep"},
	"cong_nhan_cty":      {Code: "cong_nhan_cty", IsEmployee: true},
	// Deliberately NOT flagged is_company, to prove the role code alone is
	// enough for a super admin.
	constant.ROLE_SUPER_ADMIN: {Code: constant.ROLE_SUPER_ADMIN},
}

func TestResolveReportScope(t *testing.T) {
	tests := []struct {
		name string
		user *models.User
		want reportScope
	}{
		{
			// The regression this fixes: IsCompany is bson:"-", so before the role
			// lookup this user looked like a plain org user and got an org-scoped
			// report that disagreed with their dashboard.
			name: "company role gets city-wide even though org_id is set",
			user: &models.User{OrgID: "org-1", Role: "chu_tich_cty"},
			want: reportScope{CityWide: true},
		},
		{
			name: "super_admin gets city-wide on the role code alone",
			user: &models.User{OrgID: "org-1", Role: constant.ROLE_SUPER_ADMIN},
			want: reportScope{CityWide: true},
		},
		{
			name: "org director stays scoped to their org with assignments",
			user: &models.User{
				OrgID: "org-7", Role: "giam_doc_xi_nghiep",
				AssignedRainStationIDs:       []string{"r1"},
				AssignedLakeStationIDs:       []string{"l1"},
				AssignedRiverStationIDs:      []string{"rv1"},
				AssignedInundationStationIDs: []string{"i1"},
			},
			want: reportScope{
				OrgID: "org-7", RainIDs: []string{"r1"}, LakeIDs: []string{"l1"},
				RiverIDs: []string{"rv1"}, InundationIDs: []string{"i1"},
			},
		},
		{
			name: "employee stays scoped to their org",
			user: &models.User{OrgID: "org-2", Role: "cong_nhan_cty"},
			want: reportScope{OrgID: "org-2"},
		},
		{
			name: "user without an org falls back to city-wide",
			user: &models.User{OrgID: "", Role: "giam_doc_xi_nghiep"},
			want: reportScope{CityWide: true},
		},
		{
			name: "role missing from the table is treated as non-company",
			user: &models.User{OrgID: "org-9", Role: "role_not_in_table"},
			want: reportScope{OrgID: "org-9"},
		},
		{
			name: "display-name roles do not grant city-wide",
			user: &models.User{OrgID: "org-1", Role: "Super Admin"},
			want: reportScope{OrgID: "org-1"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := &service{
				userRepo: &fakeUserRepo{user: tt.user},
				roleRepo: &fakeRoleRepo{roles: testRoles},
			}
			got := s.resolveReportScope(context.Background(), "u-1")
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("resolveReportScope mismatch\n got: %+v\nwant: %+v", got, tt.want)
			}
		})
	}
}

func TestResolveReportScopeWithoutUser(t *testing.T) {
	t.Run("empty user id is city-wide", func(t *testing.T) {
		s := &service{userRepo: &fakeUserRepo{user: &models.User{OrgID: "org-1"}}}
		if got := s.resolveReportScope(context.Background(), ""); !got.CityWide {
			t.Errorf("got %+v, want CityWide", got)
		}
	})

	t.Run("nil user repo is city-wide", func(t *testing.T) {
		s := &service{}
		if got := s.resolveReportScope(context.Background(), "u-1"); !got.CityWide {
			t.Errorf("got %+v, want CityWide", got)
		}
	})

	t.Run("unknown user is city-wide", func(t *testing.T) {
		s := &service{userRepo: &fakeUserRepo{user: nil}}
		if got := s.resolveReportScope(context.Background(), "missing"); !got.CityWide {
			t.Errorf("got %+v, want CityWide", got)
		}
	})

	t.Run("without a role repo a company user stays org-scoped", func(t *testing.T) {
		// IsCompany cannot be derived without the role table, so the safe
		// fallback is the narrower scope.
		s := &service{userRepo: &fakeUserRepo{user: &models.User{OrgID: "org-1", Role: "chu_tich_cty"}}}
		got := s.resolveReportScope(context.Background(), "u-1")
		if got.CityWide || got.OrgID != "org-1" {
			t.Errorf("got %+v, want org-scoped to org-1", got)
		}
	})
}
