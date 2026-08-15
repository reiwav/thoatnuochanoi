package gemini

// The two open-ended database tools, which let the model read collections
// directly for questions the purpose-built tools do not cover.

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"ai-api-tnhn/internal/constant"
	"ai-api-tnhn/internal/service/query"
	"ai-api-tnhn/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// handleDatabaseQuery runs a find against a collection the model names.
// Collection-level access rules are enforced by the query service.
func (s *service) handleDatabaseQuery(ctx context.Context, args map[string]interface{}) (interface{}, error) {
	collectionVal, err := requireStr(args, "collection")
	if err != nil {
		return nil, err
	}
	filterVal, _ := argMap(args, "filter")
	log.Printf("[ToolDatabaseQuery] collection=%s, filter=%+v", collectionVal, filterVal)

	if collectionVal == constant.CollRainRecords {
		s.ensureRainDataLoaded(ctx, filterVal)
	}

	res, queryErr := s.querySvc.Query(ctx, collectionVal, filterVal, 0)
	if queryErr == nil {
		formatTimestampsInResult(res)
	}
	return res, queryErr
}

// handleDatabaseAggregate runs an aggregation pipeline the model supplies.
func (s *service) handleDatabaseAggregate(ctx context.Context, args map[string]interface{}) (interface{}, error) {
	collectionVal, err := requireStr(args, "collection")
	if err != nil {
		return nil, err
	}
	log.Printf("[ToolDatabaseAggregate] collection=%s, pipeline=%+v", collectionVal, args["pipeline"])

	pipeline, err := decodePipeline(args["pipeline"])
	if err != nil {
		return nil, err
	}

	if collectionVal == constant.CollRainRecords {
		s.ensureRainDataLoaded(ctx, pipeline)
	}
	pipeline = query.EnforceInundationPipeline(collectionVal, pipeline)

	res, err := s.querySvc.Aggregate(ctx, collectionVal, pipeline)
	if err == nil {
		formatTimestampsInResult(res)
	}
	return res, err
}

// decodePipeline converts the model's pipeline argument into bson stages.
//
// Extended JSON is tried first so operators like $date survive, with plain JSON
// as a fallback for pipelines that use none of them.
func decodePipeline(raw interface{}) ([]bson.M, error) {
	pipelineBytes, err := json.Marshal(raw)
	if err != nil {
		return nil, fmt.Errorf("lỗi khi mã hóa pipeline: %w", err)
	}

	var pipeline []bson.M
	if err := bson.UnmarshalExtJSON(pipelineBytes, true, &pipeline); err != nil {
		if err := json.Unmarshal(pipelineBytes, &pipeline); err != nil {
			return nil, fmt.Errorf("lỗi khi giải mã pipeline: %w", err)
		}
	}
	return pipeline, nil
}

// ensureRainDataLoaded warms the rain_records collection for any date mentioned
// in a query.
//
// Rain readings are pulled from an upstream system on demand, so a date that has
// never been asked for has no rows yet and a direct query would return nothing.
func (s *service) ensureRainDataLoaded(ctx context.Context, filterOrPipeline interface{}) {
	for _, date := range extractDates(filterOrPipeline) {
		log.Printf("[ensureRainDataLoaded] pre-fetching rain records for date %s", date)
		if _, err := s.rainSvc.GetRainDataByDate(ctx, date); err != nil {
			log.Printf("[ensureRainDataLoaded] error pre-fetching rain records for date %s: %v", date, err)
		}
	}
}

// extractDates collects every distinct YYYY-MM-DD date reachable in an arbitrary
// filter or pipeline, in first-seen order.
//
// The structure is unpredictable (the model composes it), so this walks the
// whole tree and scans strings for date substrings rather than looking at
// specific fields.
func extractDates(v interface{}) []string {
	var dates []string
	seen := make(map[string]bool)

	add := func(d string) {
		if !seen[d] {
			seen[d] = true
			dates = append(dates, d)
		}
	}

	var walk func(x interface{})
	walk = func(x interface{}) {
		if x == nil {
			return
		}
		switch val := x.(type) {
		case string:
			for _, d := range scanDateSubstrings(val) {
				add(d)
			}
		case time.Time:
			add(utils.FormatDate(val))
		case primitive.DateTime:
			add(utils.FormatDate(val.Time()))
		case map[string]interface{}:
			for _, item := range val {
				walk(item)
			}
		case []interface{}:
			for _, item := range val {
				walk(item)
			}
		case primitive.A:
			for _, item := range val {
				walk(item)
			}
		case primitive.M:
			for _, item := range val {
				walk(item)
			}
		case primitive.D:
			for _, elem := range val {
				walk(elem.Value)
			}
		case []primitive.M:
			for _, item := range val {
				walk(item)
			}
		case []primitive.D:
			for _, item := range val {
				walk(item)
			}
		case primitive.E:
			walk(val.Value)
		}
	}
	walk(v)
	return dates
}

// scanDateSubstrings returns every YYYY-MM-DD window inside s, so dates embedded
// in longer strings (ISO timestamps, sentences) are still found.
func scanDateSubstrings(s string) []string {
	const dateLen = 10
	var found []string
	for i := 0; i+dateLen <= len(s); i++ {
		if candidate := s[i : i+dateLen]; looksLikeDate(candidate) {
			found = append(found, candidate)
		}
	}
	return found
}

// looksLikeDate reports whether a 10-character window is digits separated by
// hyphens in YYYY-MM-DD positions.
func looksLikeDate(s string) bool {
	if len(s) != 10 || s[4] != '-' || s[7] != '-' {
		return false
	}
	for i := 0; i < 10; i++ {
		if i == 4 || i == 7 {
			continue
		}
		if s[i] < '0' || s[i] > '9' {
			return false
		}
	}
	return true
}
