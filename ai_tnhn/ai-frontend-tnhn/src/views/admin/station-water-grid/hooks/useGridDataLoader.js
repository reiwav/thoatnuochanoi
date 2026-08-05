import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import stationApi from 'api/station';
import settingApi from 'api/setting';
import organizationApi from 'api/organization';

export const useGridDataLoader = (selectedDate) => {
    const [loading, setLoading] = useState(false);
    const [stations, setStations] = useState([]);
    const [organizations, setOrganizations] = useState([]);
    const [activeSetting, setActiveSetting] = useState(null);
    const [gridValues, setGridValues] = useState({});

    // Load active setting for threshold calculations
    useEffect(() => {
        const fetchSetting = async () => {
            try {
                const res = await settingApi.getActiveWaterThreshold(selectedDate.year());
                setActiveSetting(res?.data || res);
            } catch (err) {
                console.error('Failed to load active water threshold setting:', err);
            }
        };
        fetchSetting();
    }, [selectedDate]);

    // Load stations and grid records
    const loadData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const [riverRes, lakeRes, orgRes] = await Promise.all([
                stationApi.river.getAll({ per_page: 1000 }),
                stationApi.lake.getAll({ per_page: 1000 }),
                organizationApi.getSelectionList()
            ]);

            const rivers = (riverRes?.tram || riverRes?.data || (Array.isArray(riverRes) ? riverRes : [])).map(s => ({
                ...s,
                type: 'river',
                typeName: 'Sông'
            }));

            const lakes = (lakeRes?.tram || lakeRes?.data || (Array.isArray(lakeRes) ? lakeRes : [])).map(s => ({
                ...s,
                type: 'lake',
                typeName: 'Hồ'
            }));

            const allStations = [...rivers, ...lakes].sort((a, b) => (a.ThuTu || 0) - (b.ThuTu || 0));
            setStations(allStations);

            const orgList = [];
            if (orgRes) {
                if (Array.isArray(orgRes)) {
                    orgList.push(...orgRes);
                } else {
                    if (Array.isArray(orgRes.primary)) orgList.push(...orgRes.primary);
                    if (Array.isArray(orgRes.shared)) orgList.push(...orgRes.shared);
                }
            }
            setOrganizations(orgList);

            // Populate gridValues with historical records belonging strictly to selectedDate
            const initialValues = {};
            const latestMap = {};

            const dateStr = selectedDate ? selectedDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
            const startTimeStr = selectedDate ? selectedDate.startOf('day').toISOString() : dayjs().startOf('day').toISOString();
            const endTimeStr = selectedDate ? selectedDate.endOf('day').toISOString() : dayjs().endOf('day').toISOString();

            try {
                const historyRes = await stationApi.water.getGridData({
                    date: dateStr,
                    start_time: startTimeStr,
                    end_time: endTimeStr
                });
                const records = historyRes?.data || historyRes || [];
                if (Array.isArray(records)) {
                    records.forEach(item => {
                        const stType = item.station_type;
                        const stId = item.station_id;
                        if (!stType || !stId || !item.timestamp) return;

                        const key = `${stType}_${stId}`;
                        const itemTime = dayjs(item.timestamp);

                        if (!latestMap[key] || itemTime.isAfter(latestMap[key]) || itemTime.isSame(latestMap[key])) {
                            latestMap[key] = itemTime;
                            initialValues[`${key}_now`] = item.value;
                            initialValues[`${key}_now_id`] = item.record_id;
                            initialValues[`${key}_nowTime`] = itemTime.toISOString();
                        }

                        const timeStr = itemTime.format('HH:mm');

                        if (timeStr === '06:30') {
                            initialValues[`${key}_6h30`] = item.value;
                            initialValues[`${key}_6h30_id`] = item.record_id;
                        } else if (timeStr === '13:30') {
                            initialValues[`${key}_13h30`] = item.value;
                            initialValues[`${key}_13h30_id`] = item.record_id;
                        }

                        initialValues[`${key}_0_${timeStr}`] = item.value;
                        initialValues[`${key}_0_${timeStr}_id`] = item.record_id;
                    });
                }
            } catch (histErr) {
                console.error('Failed to load grid history records:', histErr);
            }

            setGridValues(prev => ({
                ...initialValues,
                ...prev
            }));
        } catch (err) {
            console.error('Failed to load stations for Grid Data Entry:', err);
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, [selectedDate]);

    // Initial load and periodic silent auto-polling (every 30 seconds)
    useEffect(() => {
        loadData();
        const interval = setInterval(() => {
            loadData(true);
        }, 30000);
        return () => clearInterval(interval);
    }, [loadData]);

    return {
        loading,
        stations,
        organizations,
        activeSetting,
        gridValues,
        setGridValues,
        loadData
    };
};
