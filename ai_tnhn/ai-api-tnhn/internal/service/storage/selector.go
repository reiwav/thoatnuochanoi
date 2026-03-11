package storage

import (
	"ai-api-tnhn/config"
	"fmt"
)

func NewStorageService(conf config.Config) (Service, error) {
	switch conf.StorageType {
	case "local":
		return NewLocalService(conf.LocalStoragePath)
	case "driver":
		// This will be handled by the Googledrive Service implementation
		// which also implements this interface.
		// However, for a generic storage request, we might need a fallback
		// or a way to get the drive service as a storage.Service.
		return nil, fmt.Errorf("driver storage type should be initialized via googledrive package")
	default:
		return nil, fmt.Errorf("invalid storage type: %s", conf.StorageType)
	}
}
