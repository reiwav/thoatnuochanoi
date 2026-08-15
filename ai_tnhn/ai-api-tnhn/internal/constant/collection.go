package constant

// Mongo collection names that application code refers to by name.
//
// Most data access goes through a typed repository that knows its own
// collection. These constants exist for the places that address a collection
// dynamically - chiefly the AI database-query tools, where the collection is
// chosen at runtime - so the name is written once instead of being repeated as a
// literal at every comparison.
const (
	CollInundationReports = "inundation_reports"
	CollRainRecords       = "rain_records"
	CollOrganizations     = "organizations"
)
