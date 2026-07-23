import { useState, useCallback } from 'react';
import dayjs from 'dayjs';
import stationApi from 'api/station';
import { getSlotTimestamp } from '../utils/gridHelpers';

export const useWaterGridSaving = (gridValues, selectedDate, loadData) => {
    const [saving, setSaving] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);

    // Save a single cell instantly on blur/edit
    const saveSingleCell = useCallback(async (st, slotKey, value) => {
        if (value === '' || value === undefined || value === null || isNaN(parseFloat(value))) return;
        const numVal = parseFloat(value);
        const oldId = st.OldId || st.old_id || st.Id || st.id;
        const dateStr = selectedDate.format('YYYY-MM-DD');
        const timestamp = getSlotTimestamp(slotKey, selectedDate);

        try {
            await stationApi.water.saveSingleGridData({
                station_type: st.type,
                station_id: oldId,
                value: numVal,
                timestamp: timestamp.toISOString(),
                date: dateStr
            });
        } catch (err) {
            console.error('Failed to save single water record cell:', err);
        }
    }, [selectedDate]);

    // Submit Batch payload to backend for all values
    const handleSaveBatch = useCallback(async () => {
        setSaving(true);
        try {
            const records = [];
            const dateStr = selectedDate.format('YYYY-MM-DD');

            Object.entries(gridValues).forEach(([key, val]) => {
                if (val === '' || val === undefined || val === null || isNaN(parseFloat(val))) return;
                const numVal = parseFloat(val);
                const parts = key.split('_');
                if (parts.length < 3) return;

                const stationType = parts[0];
                const oldId = parseInt(parts[1], 10);
                const slotKey = parts.slice(2).join('_');
                const timestamp = getSlotTimestamp(slotKey, selectedDate);

                records.push({
                    station_type: stationType,
                    station_id: oldId,
                    value: numVal,
                    timestamp: timestamp.toISOString(),
                    date: dateStr
                });
            });

            if (records.length === 0) {
                alert('Vui lòng nhập ít nhất 1 giá trị mực nước trước khi lưu!');
                setSaving(false);
                return;
            }

            await stationApi.water.batchUpsertGridData({ records });
            alert(`Đã lưu thành công ${records.length} bản ghi mực nước!`);
            loadData();
        } catch (err) {
            console.error('Failed to batch save water records:', err);
            alert('Có lỗi xảy ra khi lưu dữ liệu. Vui lòng thử lại!');
        } finally {
            setSaving(false);
        }
    }, [gridValues, selectedDate, loadData]);

    // Save batch for a specific group of stations (Xí nghiệp)
    const handleSaveGroup = useCallback(async (group) => {
        if (!group || !group.stations) return;
        setSaving(true);
        try {
            const groupStationIds = new Set(
                group.stations.map(st => `${st.type}_${st.OldId || st.old_id || st.Id || st.id}`)
            );

            const records = [];
            const dateStr = selectedDate.format('YYYY-MM-DD');

            Object.entries(gridValues).forEach(([key, val]) => {
                if (val === '' || val === undefined || val === null || isNaN(parseFloat(val))) return;
                const numVal = parseFloat(val);
                const parts = key.split('_');
                if (parts.length < 3) return;

                const stationType = parts[0];
                const oldId = parseInt(parts[1], 10);
                const stationKey = `${stationType}_${oldId}`;

                if (!groupStationIds.has(stationKey)) return;

                const slotKey = parts.slice(2).join('_');
                const timestamp = getSlotTimestamp(slotKey, selectedDate);

                records.push({
                    station_type: stationType,
                    station_id: oldId,
                    value: numVal,
                    timestamp: timestamp.toISOString(),
                    date: dateStr
                });
            });

            if (records.length === 0) {
                alert(`Vui lòng nhập ít nhất 1 giá trị mực nước cho ${group.orgName} trước khi lưu!`);
                setSaving(false);
                return;
            }

            await stationApi.water.batchUpsertGridData({ records });
            alert(`Đã lưu thành công ${records.length} bản ghi mực nước cho ${group.orgName}!`);
            setEditingGroup(null);
            loadData();
        } catch (err) {
            console.error('Failed to batch save water records for group:', err);
            alert('Có lỗi xảy ra khi lưu dữ liệu. Vui lòng thử lại!');
        } finally {
            setSaving(false);
        }
    }, [gridValues, selectedDate, loadData]);

    return {
        saving,
        editingGroup,
        setEditingGroup,
        saveSingleCell,
        handleSaveBatch,
        handleSaveGroup
    };
};
