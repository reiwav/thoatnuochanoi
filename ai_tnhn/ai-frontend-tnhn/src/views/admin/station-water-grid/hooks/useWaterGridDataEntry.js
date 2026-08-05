import { useMemo, useCallback } from 'react';
import dayjs from 'dayjs';
import { getSlotTimestamp, calculateFlexibleSlots, calculateThresholdStatus, exportGridToExcel } from '../utils/gridHelpers';
import { useGridFilterState } from './useGridFilterState';
import { useGridDataLoader } from './useGridDataLoader';
import { useGridStationGroups } from './useGridStationGroups';
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

    // 3. Station filtering & organization grouping
    const {
        filteredStations,
        groupedStations,
        riverCount,
        lakeCount
    } = useGridStationGroups(stations, organizations, stationTypeFilter);

    // 4. Single cell & batch saving actions
    const {
        saving,
        editingGroup,
        setEditingGroup,
        saveSingleCell
    } = useWaterGridSaving(gridValues, setGridValues, selectedDate, loadData);

    // Calculate slots for flexible mode
    const flexibleSlots = useMemo(() => {
        return calculateFlexibleSlots(mode, stepCycle, selectedDate);
    }, [mode, stepCycle, selectedDate]);

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
        handleExportExcel,
        editingGroup,
        setEditingGroup,
        refresh: loadData
    };
};

export default useWaterGridDataEntry;
