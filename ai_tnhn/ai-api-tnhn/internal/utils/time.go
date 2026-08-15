package utils

import (
	"ai-api-tnhn/utils"
	"time"
)

var (
	VietnamLocation = utils.VietnamLocation
	VietnamTZ       = utils.VietnamTZ
)

var (
	NowVietnam            = utils.NowVietnam
	ToVietnam             = utils.ToVietnam
	TodayVietnam          = utils.TodayVietnam
	FormatDateTime        = utils.FormatDateTime
	FormatDate            = utils.FormatDate
	FormatTime            = utils.FormatTime
	FormatDisplayDate     = utils.FormatDisplayDate
	FormatDisplayDateTime = utils.FormatDisplayDateTime
	ParseVietnamTime      = utils.ParseVietnamTime
	ParseFlexibleTime     = utils.ParseFlexibleTime
	ConvertUTCToVietnam   = utils.ConvertUTCToVietnam
	GetRainDate           = utils.GetRainDate
	CurrentRainDate       = utils.CurrentRainDate
)

func ParseTime(s string) (time.Time, error) {
	return utils.ParseVietnamTime(s)
}
