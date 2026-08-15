package query

// Access rules for the dynamic (AI-driven) query surface, kept in one place so
// the read restrictions and the inundation scoping rule are visible together
// rather than being repeated at each call site.

import (
	"ai-api-tnhn/internal/constant"

	"go.mongodb.org/mongo-driver/bson"
)

// restrictedCollections may never be read through the dynamic query surface.
// They hold credentials, permission wiring, or AI bookkeeping that the model has
// no business reading back.
var restrictedCollections = map[string]bool{
	"tokens":           true,
	"users":            true,
	"settings":         true,
	"role_permissions": true,
	"permissions":      true,
	"roles":            true,
	"ai_usage_records": true,
	"ai_chat_logs":     true,
}

// sensitiveFields are stripped from every returned document as a second line of
// defence, in case one of them surfaces from a collection that is readable.
var sensitiveFields = []string{"password", "token"}

// maxDynamicQueryLimit caps how many documents a single dynamic query returns.
//
// TODO(B7): this also silently caps lookups that are meant to be exhaustive.
// Callers that build an id -> name map (organisations, for example) pass limit 0
// and end up with at most this many entries, so ids beyond the cap render raw.
const maxDynamicQueryLimit = 100

// enforceInundationFilter scopes a find on inundation_reports to reports that
// actually flooded. Points are polled continuously and most reports record "no
// flooding", so an unscoped query is dominated by non-events.
func enforceInundationFilter(collectionName string, filter bson.M) {
	if collectionName == constant.CollInundationReports {
		filter["has_flooded"] = true
	}
}

// EnforceInundationPipeline applies the same rule as enforceInundationFilter to
// an aggregation pipeline: it folds has_flooded into the first $match stage, or
// prepends one when the pipeline has no $match, so the condition is applied
// before any $group.
//
// Exported because the AI aggregate tool assembles its pipeline before handing
// it over, and the rule must be applied to the pipeline rather than to a filter.
func EnforceInundationPipeline(collectionName string, pipeline []bson.M) []bson.M {
	if collectionName != constant.CollInundationReports {
		return pipeline
	}
	for i, stage := range pipeline {
		if match, ok := stage["$match"].(bson.M); ok {
			match["has_flooded"] = true
			pipeline[i]["$match"] = match
			return pipeline
		}
	}
	return append([]bson.M{{"$match": bson.M{"has_flooded": true}}}, pipeline...)
}

// stripSensitiveFields removes credential-bearing keys from query results.
func stripSensitiveFields(results []map[string]interface{}) {
	for i := range results {
		for _, f := range sensitiveFields {
			delete(results[i], f)
		}
	}
}
