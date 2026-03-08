package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"golang.org/x/net/html"
	"golang.org/x/text/encoding/unicode"
	"golang.org/x/text/transform"
)

// RainfallData Map: StationName -> Date -> RainfallValue
type RainfallData map[string]map[string]float64

func main() {
	files, err := filepath.Glob("../2*.xls")
	if err != nil {
		log.Fatal(err)
	}

	allData := make(RainfallData)

	for _, file := range files {
		fmt.Printf("Processing %s...\n", file)
		if err := processFile(file, allData); err != nil {
			log.Printf("Error processing %s: %v", file, err)
		}
	}

	outputFile := "rainfall_data.json"
	data, err := json.MarshalIndent(allData, "", "  ")
	if err != nil {
		log.Fatal(err)
	}

	if err := os.WriteFile(outputFile, data, 0644); err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Successfully generated %s\n", outputFile)
}

func processFile(filePath string, allData RainfallData) error {
	f, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer f.Close()

	// Decode UTF-16 (little-endian) to UTF-8
	// Based on previous analysis, these files are UTF-16LE
	decoder := unicode.UTF16(unicode.LittleEndian, unicode.UseBOM).NewDecoder()
	utf8Reader := transform.NewReader(f, decoder)

	doc, err := html.Parse(utf8Reader)
	if err != nil {
		return err
	}

	var stations []string
	var visitTable func(*html.Node)
	visitTable = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "table" {
			parseTable(n, &stations, allData)
			return
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			visitTable(c)
		}
	}
	visitTable(doc)

	return nil
}

func parseTable(table *html.Node, stations *[]string, allData RainfallData) {
	var visitRow func(*html.Node)
	visitRow = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "tr" {
			var cells []string
			for c := n.FirstChild; c != nil; c = c.NextSibling {
				if c.Type == html.ElementNode && (c.Data == "th" || c.Data == "td") {
					cells = append(cells, getText(c))
				}
			}

			if len(cells) > 0 {
				if cells[0] == "Ngày" { // Header row
					for i := 1; i < len(cells); i++ {
						*stations = append(*stations, strings.TrimSpace(cells[i]))
					}
				} else { // Data row
					date := formatDate(cells[0])
					if date == "" {
						return
					}
					for i := 1; i < len(cells) && i-1 < len(*stations); i++ {
						valStr := strings.TrimSpace(cells[i])
						// Replace &nbsp; or empty or "-"
						if valStr == "" || valStr == "-" {
							continue
						}
						valStr = strings.ReplaceAll(valStr, "\u00a0", "") // &nbsp;
						if valStr == "" {
							continue
						}

						val, err := strconv.ParseFloat(valStr, 64)
						if err != nil {
							continue
						}

						station := (*stations)[i-1]
						if allData[station] == nil {
							allData[station] = make(map[string]float64)
						}
						allData[station][date] = val
					}
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			visitRow(c)
		}
	}
	visitRow(table)
}

func getText(n *html.Node) string {
	var b strings.Builder
	var f func(*html.Node)
	f = func(n *html.Node) {
		if n.Type == html.TextNode {
			b.WriteString(n.Data)
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			f(c)
		}
	}
	f(n)
	return b.String()
}

func formatDate(d string) string {
	d = strings.TrimSpace(d)
	parts := strings.Split(d, "/")
	if len(parts) != 3 {
		return ""
	}
	// DD/MM/YYYY -> YYYY-MM-DD
	return fmt.Sprintf("%s-%s-%s", parts[2], parts[1], parts[0])
}
