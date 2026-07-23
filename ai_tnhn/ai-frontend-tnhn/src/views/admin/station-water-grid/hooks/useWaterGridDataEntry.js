import { useState, useEffect, useMemo, useCallback } from 'react';
import dayjs from 'dayjs';
import stationApi from 'api/station';
import settingApi from 'api/setting';
import organizationApi from 'api/organization';
import { getSlotTimestamp, calculateFlexibleSlots, calculateThresholdStatus } from '../utils/gridHelpers';
import { useWaterGridSaving } from './useWaterGridSaving';

const useWaterGridDataEntry = () => {
    const [loading, setLoading] = useState(false);
    const [stations, setStations] = useState([]);
    const [organizations, setOrganizations] = useState([]);
    const [activeSetting, setActiveSetting] = useState(null);

    // Filter & Mode state
    const [mode, setMode] = useState('fixed'); // 'fixed' | 'flexible'
    const [stepCycle, setStepCycle] = useState('1h'); // '5m'|'10m'|'15m'|'20m'|'30m'|'1h'|'2h'
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [stationTypeFilter, setStationTypeFilter] = useState('river'); // 'river'|'lake'
    const [activeEditOrgs, setActiveEditOrgs] = useState({});

    const toggleOrgEditMode = useCallback((orgId) => {
        setActiveEditOrgs(prev => ({
            ...prev,
            [orgId]: !prev[orgId]
        }));
    }, []);

    // Grid data state: key = `${stationType}_${stationOldId}_${timeSlotKey}` -> value
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

    // Load stations and initial grid records
    const loadData = useCallback(async () => {
        setLoading(true);
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

            // Only populate gridValues with historical records belonging strictly to selectedDate
            const initialValues = {};
            const latestMap = {};

            // Fetch history for selectedDate / time range
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

                        // Pick the most recent record timestamp in DB for "now" (Hiện tại) column
                        if (!latestMap[key] || itemTime.isAfter(latestMap[key]) || itemTime.isSame(latestMap[key])) {
                            latestMap[key] = itemTime;
                            initialValues[`${key}_now`] = item.value;
                            initialValues[`${key}_nowTime`] = itemTime.toISOString();
                        }

                        const timeStr = itemTime.format('HH:mm');

                        // Fixed mode slots: 6h30 and 13h30
                        if (timeStr === '06:30') {
                            initialValues[`${key}_6h30`] = item.value;
                        } else if (timeStr === '13:30') {
                            initialValues[`${key}_13h30`] = item.value;
                        }

                        // Flexible mode slot mapping: 0_HH:mm
                        initialValues[`${key}_0_${timeStr}`] = item.value;
                    });
                }
            } catch (histErr) {
                console.error('Failed to load grid history records:', histErr);
            }

            setGridValues(initialValues);
        } catch (err) {
            console.error('Failed to load stations for Grid Data Entry:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Calculate slots for flexible mode
    const flexibleSlots = useMemo(() => {
        return calculateFlexibleSlots(mode, stepCycle, selectedDate);
    }, [mode, stepCycle, selectedDate]);

    // Filtered Stations
    const filteredStations = useMemo(() => {
        return stations.filter(s => s.type === stationTypeFilter);
    }, [stations, stationTypeFilter]);

    const riverCount = useMemo(() => stations.filter(s => s.type === 'river').length, [stations]);
    const lakeCount = useMemo(() => stations.filter(s => s.type === 'lake').length, [stations]);

    // Group stations by managing organization (Xí nghiệp)
    const groupedStations = useMemo(() => {
        const orgMap = {};
        organizations.forEach(o => {
            if (o.id) orgMap[o.id] = o;
        });

        const groupsMap = {};
        const unassigned = [];

        filteredStations.forEach(st => {
            const orgId = st.org_id;
            const orgObj = orgMap[orgId];
            const orgName = orgObj?.name || orgObj?.name_display || st.org_name;

            if (orgId && orgName) {
                if (!groupsMap[orgId]) {
                    groupsMap[orgId] = {
                        orgId,
                        orgName,
                        stations: []
                    };
                }
                groupsMap[orgId].stations.push(st);
            } else {
                unassigned.push(st);
            }
        });

        const result = Object.values(groupsMap).sort((a, b) => 
            (a.orgName || '').localeCompare(b.orgName || '', 'vi', { numeric: true, sensitivity: 'base' })
        );

        if (unassigned.length > 0) {
            result.push({
                orgId: 'unassigned',
                orgName: 'Trạm khác / Chưa phân xí nghiệp',
                stations: unassigned
            });
        }

        return result;
    }, [filteredStations, organizations]);

    // Cell value change handler
    const handleCellChange = (stationType, oldId, slotKey, value) => {
        const key = `${stationType}_${oldId}_${slotKey}`;
        const nowKey = `${stationType}_${oldId}_now`;
        const nowTimeKey = `${stationType}_${oldId}_nowTime`;

        setGridValues(prev => {
            const next = { ...prev, [key]: value };

            if (slotKey === 'now') {
                const nowTime = getSlotTimestamp('now', selectedDate);
                next[nowTimeKey] = nowTime.toISOString();
                return next;
            }

            const slotTime = getSlotTimestamp(slotKey, selectedDate);
            const currentNowTimeStr = prev[nowTimeKey];
            const currentNowTime = currentNowTimeStr ? dayjs(currentNowTimeStr) : null;

            // If value is entered AND (current "now" is empty OR newly entered slot timestamp >= current now timestamp)
            if (value !== '' && value !== undefined && value !== null && (!currentNowTime || slotTime.isAfter(currentNowTime) || slotTime.isSame(currentNowTime))) {
                next[nowKey] = value;
                next[nowTimeKey] = slotTime.toISOString();
            }

            return next;
        });
    };

    // Calculate threshold status color for a specific cell
    const getCellThresholdStatus = useCallback((station, slotKey, valStr) => {
        return calculateThresholdStatus(station, valStr, selectedDate, activeSetting);
    }, [selectedDate, activeSetting]);

    // Use saving sub-hook
    const {
        saving,
        editingGroup,
        setEditingGroup,
        saveSingleCell,
        handleSaveBatch,
        handleSaveGroup
    } = useWaterGridSaving(gridValues, selectedDate, loadData);

    return {
        loading,
        saving,
        mode,
        setMode,
        stepCycle,
        setStepCycle,
        selectedDate,
        setSelectedDate,
        stationTypeFilter,
        setStationTypeFilter,
        filteredStations,
        groupedStations,
        riverCount,
        lakeCount,
        flexibleSlots,
        gridValues,
        activeEditOrgs,
        toggleOrgEditMode,
        handleCellChange,
        saveSingleCell,
        getCellThresholdStatus,
        handleSaveBatch,
        handleSaveGroup,
        editingGroup,
        setEditingGroup,
        refresh: loadData
    };
};

export default useWaterGridDataEntry;
