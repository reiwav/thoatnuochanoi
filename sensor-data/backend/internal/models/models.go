package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	ID       primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Username string             `bson:"username" json:"username"`
	Password string             `bson:"password" json:"-"`
}

type Alarm struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	AlarmID   string             `bson:"alarm_id" json:"alarmId"`
	Date      string             `bson:"date" json:"date"`
	Time      string             `bson:"time" json:"time"`
	Message   string             `bson:"message" json:"message"`
	CreatedAt time.Time          `bson:"created_at" json:"createdAt"`
}

type Monitor struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Order     string             `bson:"order" json:"order"`
	Name      string             `bson:"name" json:"name"`
	Value     string             `bson:"value" json:"value"`
	Unit      string             `bson:"unit" json:"unit"`
	Status    string             `bson:"status" json:"status"`
	Max       string             `bson:"max" json:"max"`
	Min       string             `bson:"min" json:"min"`
	Avg       string             `bson:"avg" json:"avg"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updatedAt"`
}

type Output struct {
	ID      primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name    string             `bson:"name" json:"name"`
	Control bool               `bson:"control" json:"control"` // ON/OFF
	Mode    string             `bson:"mode" json:"mode"`       // Man/Auto
}

type DeviceConfig struct {
	ID           int     `bson:"id" json:"id"`
	Name         string  `bson:"name" json:"name"` // Description in the table
	Code         string  `bson:"code" json:"code"` // Name (l=tab) in the table
	AddressSlave string  `bson:"address_slave" json:"addressSlave"`
	FunctionCode string  `bson:"function_code" json:"functionCode"`
	Register     int     `bson:"register" json:"register"`
	Length       int     `bson:"length" json:"length"`
	DataType     string  `bson:"data_type" json:"dataType"`
	WarningSet   float64 `bson:"warning_set" json:"warningSet"`
	HighAlarmSet float64 `bson:"high_alarm_set" json:"highAlarmSet"`
	Unit         string  `bson:"unit" json:"unit"`
}

type Device struct {
	ID      primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name    string             `bson:"name" json:"name"`
	Address string             `bson:"address" json:"address"`
	IP      string             `bson:"ip" json:"ip"`
	Link    string             `bson:"link" json:"link"`
	Config  []DeviceConfig     `bson:"config" json:"config"`
}

type HistoryTrend struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	DeviceLink   string             `bson:"device_link" json:"deviceLink"`
	DeviceIP     string             `bson:"device_ip" json:"deviceIp"`
	Code         string             `bson:"code" json:"code"`
	SensorType   int                `bson:"sensor_type" json:"sensorType"`
	Timestamp    time.Time          `bson:"timestamp" json:"timestamp"`
	Value        float64            `bson:"value" json:"value"`
	WarningSet   float64            `bson:"warning_set" json:"warningSet"`
	HighAlarmSet float64            `bson:"high_alarm_set" json:"highAlarmSet"`
	Status       int                `bson:"status" json:"status"` // 0: Normal, 1: Warning, 2: High
}
