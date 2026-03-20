package constants

type SensorType int

const (
	SensorPH       SensorType = iota // 0: pH (order: 1)
	SensorTemp                       // 1: Temp (order: 2)
	SensorCOD                        // 2: COD (order: 3)
	SensorTSS                        // 3: TSS (order: 4)
	SensorFlowOut1                   // 4: Flow out 1 (order: 5)
	SensorFlowIn1                    // 5: Flow in 1 (order: 6)
	SensorNH4                        // 6: NH4+ (order: 7)
	SensorTotalOut                   // 7: Total out (order: 8)
	SensorTotalIn                    // 8: Total in (order: 9)
)

var SensorLabels = map[SensorType]string{
	SensorPH:       "pH",
	SensorTemp:     "Temp",
	SensorCOD:      "COD",
	SensorTSS:      "TSS",
	SensorFlowOut1: "Flow out 1",
	SensorFlowIn1:  "Flow in 1",
	SensorNH4:      "NH4+",
	SensorTotalOut: "Total out",
	SensorTotalIn:  "Total in",
}

func (s SensorType) String() string {
	if label, ok := SensorLabels[s]; ok {
		return label
	}
	return "Unknown"
}

func ToSensorType(label string) (SensorType, bool) {
	for k, v := range SensorLabels {
		if v == label {
			return k, true
		}
	}
	return -1, false
}
