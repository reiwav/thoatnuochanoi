import { useState, useEffect, useCallback } from 'react';
import useAuthStore from 'store/useAuthStore';
import stationApi from 'api/station';

const useEmployeeWater = () => {
    const { user } = useAuthStore();
    const [lakes, setLakes] = useState([]);
    const [rivers, setRivers] = useState([]);
    const [latestReadings, setLatestReadings] = useState({}); // key: oldId -> value, timestamp
    const [loading, setLoading] = useState(true);

    const fetchLatestReadings = async (lakeStations, riverStations) => {
        const readings = {};
        const fetchPromises = [];

        lakeStations.forEach(station => {
            const oldId = station.OldId ?? station.old_id ?? station.OldID;
            if (oldId) {
                fetchPromises.push(
                    stationApi.lake.getHistory(oldId, { limit: 1 })
                        .then(res => {
                            const latest = Array.isArray(res) ? res[0] : (res?.data ? res.data[0] : null);
                            if (latest) {
                                readings[oldId] = {
                                    value: latest.value,
                                    timestamp: latest.timestamp
                                };
                            }
                        })
                        .catch(err => console.error(`Failed to fetch history for lake ${oldId}`, err))
                );
            }
        });

        riverStations.forEach(station => {
            const oldId = station.OldId ?? station.old_id ?? station.OldID;
            if (oldId) {
                fetchPromises.push(
                    stationApi.river.getHistory(oldId, { limit: 1 })
                        .then(res => {
                            const latest = Array.isArray(res) ? res[0] : (res?.data ? res.data[0] : null);
                            if (latest) {
                                readings[oldId] = {
                                    value: latest.value,
                                    timestamp: latest.timestamp
                                };
                            }
                        })
                        .catch(err => console.error(`Failed to fetch history for river ${oldId}`, err))
                );
            }
        });

        if (fetchPromises.length > 0) {
            await Promise.all(fetchPromises);
        }
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

            await fetchLatestReadings(lakeList, riverList);
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
