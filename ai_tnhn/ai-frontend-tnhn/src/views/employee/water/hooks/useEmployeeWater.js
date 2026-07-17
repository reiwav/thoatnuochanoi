import { useState, useEffect, useCallback } from 'react';
import useAuthStore from 'store/useAuthStore';
import stationApi from 'api/station';

const useEmployeeWater = () => {
    const { user } = useAuthStore();
    const [lakes, setLakes] = useState([]);
    const [rivers, setRivers] = useState([]);
    const [latestReadings, setLatestReadings] = useState({}); // key: oldId -> value, timestamp
    const [loading, setLoading] = useState(true);

    const extractLatestReadings = (lakeStations, riverStations) => {
        const readings = {};

        lakeStations.forEach(station => {
            const oldId = station.OldId ?? station.old_id ?? station.OldID;
            if (oldId && station.latest_record) {
                readings[oldId] = {
                    value: station.latest_record.value,
                    timestamp: station.latest_record.timestamp
                };
            }
        });

        riverStations.forEach(station => {
            const oldId = station.OldId ?? station.old_id ?? station.OldID;
            if (oldId && station.latest_record) {
                readings[oldId] = {
                    value: station.latest_record.value,
                    timestamp: station.latest_record.timestamp
                };
            }
        });

        setLatestReadings(readings);
    };

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [lakesRes, riversRes] = await Promise.all([
                stationApi.lake.getAll({ per_page: 1000 }),
                stationApi.river.getAll({ per_page: 1000 })
            ]);

            const lakeList = lakesRes?.data || (Array.isArray(lakesRes) ? lakesRes : []);
            const riverList = riversRes?.data || (Array.isArray(riversRes) ? riversRes : []);

            setLakes(lakeList);
            setRivers(riverList);

            extractLatestReadings(lakeList, riverList);
        } catch (error) {
            console.error('Failed to load employee assigned stations', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return {
        user,
        lakes,
        rivers,
        latestReadings,
        loading,
        refresh: loadData
    };
};

export default useEmployeeWater;
