package main

import (
	"fmt"
)

func main() {
	args := []interface{}{0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,1,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0}
	fmt.Printf("Total items: %d\n", len(args))
	
	// Print in groups of 6
	for i := 0; i < len(args); i += 6 {
		end := i + 6
		if end > len(args) {
			end = len(args)
		}
		fmt.Printf("Pump %d: %v\n", i/6 + 1, args[i:end])
	}
}
