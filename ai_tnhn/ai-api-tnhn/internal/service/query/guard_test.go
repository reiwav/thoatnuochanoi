package query

import (
	"reflect"
	"testing"

	"ai-api-tnhn/internal/constant"

	"go.mongodb.org/mongo-driver/bson"
)

func TestEnforceInundationPipeline(t *testing.T) {
	t.Run("other collections are left alone", func(t *testing.T) {
		in := []bson.M{{"$group": bson.M{"_id": "$station_id"}}}
		got := EnforceInundationPipeline(constant.CollRainRecords, in)
		if !reflect.DeepEqual(got, in) {
			t.Errorf("pipeline was modified: %v", got)
		}
	})

	t.Run("folds into an existing $match", func(t *testing.T) {
		in := []bson.M{
			{"$match": bson.M{"org_id": "o1"}},
			{"$group": bson.M{"_id": "$point_id"}},
		}
		got := EnforceInundationPipeline(constant.CollInundationReports, in)

		if len(got) != 2 {
			t.Fatalf("expected 2 stages, got %d: %v", len(got), got)
		}
		match, ok := got[0]["$match"].(bson.M)
		if !ok {
			t.Fatalf("first stage is not a $match: %v", got[0])
		}
		if match["has_flooded"] != true {
			t.Errorf("has_flooded not applied: %v", match)
		}
		if match["org_id"] != "o1" {
			t.Errorf("existing condition lost: %v", match)
		}
	})

	t.Run("prepends a $match when none exists", func(t *testing.T) {
		in := []bson.M{{"$group": bson.M{"_id": "$point_id"}}}
		got := EnforceInundationPipeline(constant.CollInundationReports, in)

		if len(got) != 2 {
			t.Fatalf("expected 2 stages, got %d: %v", len(got), got)
		}
		match, ok := got[0]["$match"].(bson.M)
		if !ok {
			t.Fatalf("prepended stage is not a $match: %v", got[0])
		}
		if match["has_flooded"] != true {
			t.Errorf("has_flooded not applied: %v", match)
		}
		// Must come before the $group, or the aggregation counts non-events.
		if _, isGroup := got[1]["$group"]; !isGroup {
			t.Errorf("$group should follow the injected $match: %v", got)
		}
	})

	t.Run("only the first $match is touched", func(t *testing.T) {
		in := []bson.M{
			{"$match": bson.M{"org_id": "o1"}},
			{"$match": bson.M{"status": "active"}},
		}
		got := EnforceInundationPipeline(constant.CollInundationReports, in)

		second := got[1]["$match"].(bson.M)
		if _, present := second["has_flooded"]; present {
			t.Errorf("second $match should be untouched: %v", second)
		}
	})

	t.Run("empty pipeline gets the guard", func(t *testing.T) {
		got := EnforceInundationPipeline(constant.CollInundationReports, nil)
		if len(got) != 1 {
			t.Fatalf("expected 1 stage, got %d: %v", len(got), got)
		}
		if match := got[0]["$match"].(bson.M); match["has_flooded"] != true {
			t.Errorf("has_flooded not applied: %v", match)
		}
	})
}

func TestEnforceInundationFilter(t *testing.T) {
	f := bson.M{"org_id": "o1"}
	enforceInundationFilter(constant.CollInundationReports, f)
	if f["has_flooded"] != true {
		t.Errorf("has_flooded not applied: %v", f)
	}

	other := bson.M{"station_id": 1}
	enforceInundationFilter(constant.CollRainRecords, other)
	if _, present := other["has_flooded"]; present {
		t.Errorf("unrelated collection was scoped: %v", other)
	}
}

func TestRestrictedCollections(t *testing.T) {
	// Credential and permission stores must stay unreadable through the dynamic
	// query surface.
	for _, name := range []string{"tokens", "users", "roles", "permissions", "role_permissions", "settings", "ai_usage_records", "ai_chat_logs"} {
		if !restrictedCollections[name] {
			t.Errorf("%q should be restricted", name)
		}
	}
	for _, name := range []string{constant.CollInundationReports, constant.CollRainRecords, constant.CollOrganizations} {
		if restrictedCollections[name] {
			t.Errorf("%q should be readable", name)
		}
	}
}
