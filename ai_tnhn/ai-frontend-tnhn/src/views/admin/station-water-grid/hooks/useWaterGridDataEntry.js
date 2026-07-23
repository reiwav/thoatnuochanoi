import { useMemo, useCallback } from 'react';
import dayjs from 'dayjs';
import { getSlotTimestamp, calculateFlexibleSlots, calculateThresholdStatus, exportGridToExcel } from '../utils/gridHelpers';
import { useGridFilterState } from './useGridFilterState';
import { useGridDataLoader } from './useGridDataLoader';
import { useWaterGridSaving } from './useWaterGridSaving';

const useWaterGridDataEntry = () => {
    // 1. Filter state & URL search params syncing
    const {
        mode,
        setMode,
        stepCycle,
        setStepCycle,
        selectedDate,
        setSelectedDate,
        stationTypeFilter,
        setStationTypeFilter,
        activeEditOrgs,
        toggleOrgEditMode
    } = useGridFilterState();

    // 2. Station loading, grid history mapping & silent background auto-polling
    const {
        loading,
        stations,
        organizations,
        activeSetting,
        gridValues,
        setGridValues,
        loadData
    } = useGridDataLoader(selectedDate);

    // 3. Single cell & batch saving actions
    const {
        saving,
        editingGroup,
        setEditingGroup,
        saveSingleCell,
        handleSaveBatch,
        handleSaveGroup
    } = useWaterGridSaving(gridValues, selectedDate, loadData);

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
    const handleCellChange = useCallback((stationType, oldId, slotKey, value) => {
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

            if (value !== '' && value !== undefined && value !== null && (!currentNowTime || slotTime.isAfter(currentNowTime) || slotTime.isSame(currentNowTime))) {
                next[nowKey] = value;
                next[nowTimeKey] = slotTime.toISOString();
            }

            return next;
        });
    }, [selectedDate, setGridValues]);

    // Calculate threshold status color for a specific cell
    const getCellThresholdStatus = useCallback((station, slotKey, valStr) => {
        return calculateThresholdStatus(station, valStr, selectedDate, activeSetting);
    }, [selectedDate, activeSetting]);

    // Handle exporting current grid view to Excel
    const handleExportExcel = useCallback(() => {
        exportGridToExcel({
            groupedStations,
            gridValues,
            mode,
            flexibleSlots,
            stationTypeFilter,
            selectedDate
        });
    }, [groupedStations, gridValues, mode, flexibleSlots, stationTypeFilter, selectedDate]);

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
        handleExportExcel,
        editingGroup,
        setEditingGroup,
        refresh: loadData
    };
};

export default useWaterGridDataEntry;
