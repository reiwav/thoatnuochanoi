package main

import (
	"fmt"
)

func main() {
	args := []interface{}{0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,1,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0}

	operating := 0
	closed := 0
	maintenance := 0
	noSignal := 0

	for i := 0; i < 20; i++ {
		offset := i * 6
		isNoSignal := true
		for j := 0; j < 6; j++ {
			val := fmt.Sprintf("%v", args[offset+j])
			if val != "0" && val != "0.0" && val != "<nil>" && val != "" {
				isNoSignal = false
				break
			}
		}

		if isNoSignal {
			noSignal++
			continue
		}

		operatingBit := fmt.Sprintf("%v", args[offset+4])
		maintenanceBit := fmt.Sprintf("%v", args[offset+3])
		closedBit := fmt.Sprintf("%v", args[offset+1])

		if operatingBit == "1" {
			operating++
		} else if maintenanceBit == "1" {
			maintenance++
		} else if closedBit == "1" {
			closed++
		} else {
			closed++
		}
	}

	fmt.Printf("Operating: %d, Closed: %d, Maintenance: %d, NoSignal: %d\n", operating, closed, maintenance, noSignal)
}
