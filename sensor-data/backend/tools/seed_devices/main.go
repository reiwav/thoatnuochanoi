package main

import (
	"context"
	"fmt"
	"log"
	"sensor-backend/config"
	"sensor-backend/internal/db"
	"sensor-backend/internal/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

func main() {
	cfg := config.LoadConfig()
	database, err := db.ConnectMongo(cfg)
	if err != nil {
		log.Fatal(err)
	}

	collection := database.Collection("devices")

	// 1. Remove all existing devices
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err = collection.DeleteMany(ctx, bson.M{})
	if err != nil {
		log.Fatal("Could not delete existing devices:", err)
	}
	fmt.Println("Existing devices removed.")

	// 2. Add 2 new rows
	devices := []models.Device{
		{
			Name:    "Modbus RTU Registers",
			Address: "XLNT_KIMLIEN",
			IP:      "14.224.214.119",
			Link:    "http://14.224.214.119:8880",
			Config: []models.DeviceConfig{
				{ID: 1, Name: "Chỉ số đo hoạt độ của ion hydro", Code: "pH", AddressSlave: "1", FunctionCode: "3 RO Holding Regs", Register: 16, Length: 0, DataType: "Register Integer", WarningSet: 5.5, HighAlarmSet: 9, Unit: "-"},
				{ID: 2, Name: "Chỉ số đo nhiệt độ", Code: "Temp", AddressSlave: "1", FunctionCode: "3 RO Holding Regs", Register: 19, Length: 0, DataType: "Register Integer", WarningSet: 0, HighAlarmSet: 40, Unit: "oC"},
				{ID: 3, Name: "Chỉ số đo COD", Code: "COD", AddressSlave: "1", FunctionCode: "3 RO Holding Regs", Register: 17, Length: 0, DataType: "Register Integer", WarningSet: 0, HighAlarmSet: 135, Unit: "mg/l"},
				{ID: 4, Name: "Chỉ số đo TSS", Code: "TSS", AddressSlave: "1", FunctionCode: "3 RO Holding Regs", Register: 18, Length: 0, DataType: "Register Integer", WarningSet: 0, HighAlarmSet: 90, Unit: "mg/l"},
				{ID: 5, Name: "Chỉ số đo flow out 1", Code: "Flow out 1", AddressSlave: "2", FunctionCode: "3 RO Holding Regs", Register: 19, Length: 0, DataType: "Register Integer", WarningSet: 0, HighAlarmSet: 500, Unit: "m3/h"},
				{ID: 6, Name: "Chỉ số đo flow in 1", Code: "Flow in 1", AddressSlave: "2", FunctionCode: "3 RO Holding Regs", Register: 17, Length: 0, DataType: "Register Integer", WarningSet: 0, HighAlarmSet: 500, Unit: "m3/h"},
				{ID: 7, Name: "Chỉ số đo NH4+", Code: "NH4+", AddressSlave: "12", FunctionCode: "3 RO Holding Regs", Register: 2, Length: 2, DataType: "Float ABCD (32 bits)", WarningSet: 0, HighAlarmSet: 5, Unit: "mg/l"},
				{ID: 8, Name: "Chỉ số đo total out", Code: "Total out 1", AddressSlave: "5", FunctionCode: "19 Total Flow (Address Slave)", Register: 1, Length: 1, DataType: "Register Integer", WarningSet: 0, HighAlarmSet: 19999999, Unit: "m3"},
				{ID: 9, Name: "Chỉ số đo total in", Code: "Total in 1", AddressSlave: "6", FunctionCode: "19 Total Flow (Address Slave)", Register: 1, Length: 2, DataType: "Register Integer", WarningSet: 0, HighAlarmSet: 19999999, Unit: "m3"},
			},
		},
		{
			Name:    "Modbus RTU Registers",
			Address: "XLNT_TRUCBACH",
			IP:      "14.224.214.175",
			Link:    "http://14.224.214.175:8880",
			Config: []models.DeviceConfig{
				{ID: 1, Name: "Chỉ số đo hoạt độ của ion hydro", Code: "pH", AddressSlave: "1", FunctionCode: "3 RO Holding Regs", Register: 16, Length: 0, DataType: "Register Integer", WarningSet: 0, HighAlarmSet: 14, Unit: "-"},
				{ID: 2, Name: "Chỉ số đo nhiệt độ", Code: "Temp", AddressSlave: "1", FunctionCode: "3 RO Holding Regs", Register: 19, Length: 0, DataType: "Register Integer", WarningSet: 0, HighAlarmSet: 60, Unit: "oC"},
				{ID: 3, Name: "Chỉ số đo COD", Code: "COD", AddressSlave: "1", FunctionCode: "3 RO Holding Regs", Register: 17, Length: 0, DataType: "Register Integer", WarningSet: 0, HighAlarmSet: 80, Unit: "mg/l"},
				{ID: 4, Name: "Chỉ số đo TSS", Code: "TSS", AddressSlave: "1", FunctionCode: "3 RO Holding Regs", Register: 18, Length: 0, DataType: "Register Integer", WarningSet: 0, HighAlarmSet: 50, Unit: "mg/l"},
				{ID: 5, Name: "Chỉ số đo flow out 1", Code: "Flow out 1", AddressSlave: "2", FunctionCode: "3 RO Holding Regs", Register: 19, Length: 0, DataType: "Register Integer", WarningSet: 0, HighAlarmSet: 500, Unit: "m3/h"},
				{ID: 6, Name: "Chỉ số đo flow in 1", Code: "Flow in 1", AddressSlave: "2", FunctionCode: "3 RO Holding Regs", Register: 17, Length: 0, DataType: "Register Integer", WarningSet: 0, HighAlarmSet: 500, Unit: "m3/h"},
				{ID: 7, Name: "Chỉ số đo NH4+", Code: "NH4+", AddressSlave: "12", FunctionCode: "3 RO Holding Regs", Register: 2, Length: 2, DataType: "Float ABCD (32 bits)", WarningSet: 0, HighAlarmSet: 6, Unit: "mg/l"},
				{ID: 8, Name: "Chỉ số đo total out", Code: "Total out 1", AddressSlave: "5", FunctionCode: "19 Total Flow (Address Slave)", Register: 1, Length: 1, DataType: "Register Integer", WarningSet: 0, HighAlarmSet: 900000000000, Unit: "m3"},
				{ID: 9, Name: "Chỉ số đo total in", Code: "Total in 1", AddressSlave: "6", FunctionCode: "19 Total Flow (Address Slave)", Register: 1, Length: 2, DataType: "Register Integer", WarningSet: 0, HighAlarmSet: 900000000000, Unit: "m3"},
			},
		},
	}

	for _, d := range devices {
		_, err := collection.InsertOne(ctx, d)
		if err != nil {
			log.Fatalf("Error inserting device %s: %v", d.Address, err)
		}
		fmt.Printf("Added device: %s\n", d.Address)
	}

	fmt.Println("Seeding completed successfully!")
}
