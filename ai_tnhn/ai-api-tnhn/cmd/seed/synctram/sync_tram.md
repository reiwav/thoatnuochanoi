tôi có các station mưa: /Users/longtran/Desktop/Golang/ThoatNuocHaNoi/application/ai_tnhn/ai-api-tnhn/cmd/seed/synctram/tram_mua.json
và station sông, hồ: /Users/longtran/Desktop/Golang/ThoatNuocHaNoi/application/ai_tnhn/ai-api-tnhn/cmd/seed/synctram/tram_nuoc.json . Sông thì có loai = 1, hồ thì = 2
- Cần xoá dữ liệu rain_stations, lake_stations, river_stations trước khi migrate:
  + rain_stations với model /Users/longtran/Desktop/Golang/ThoatNuocHaNoi/application/ai_tnhn/ai-api-tnhn/internal/models/station.go là RainStation struct. Trong đó old_id trong table rain_stations tương ứng với field OldID trong RainStation struct.
  
  + lake_stations với model /Users/longtran/Desktop/Golang/ThoatNuocHaNoi/application/ai_tnhn/ai-api-tnhn/internal/models/station.go là LakeStation struct. Trong đó old_id trong table lake_stations tương ứng với field OldID trong LakeStation struct.
    TenTram = TenTramHTML
  + river_stations với model /Users/longtran/Desktop/Golang/ThoatNuocHaNoi/application/ai_tnhn/ai-api-tnhn/internal/models/station.go là RiverStation struct. Trong đó old_id trong table river_stations tương ứng với field OldID trong RiverStation struct.
    TenTram = TenTramHTML