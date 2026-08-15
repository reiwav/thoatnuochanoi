import { useState, useCallback } from 'react';
import dayjs from 'dayjs';
import stationApi from 'api/station';
import { getSlotTimestamp, getStationId } from '../utils/gridHelpers';

export const useWaterGridSaving = (gridValues, setGridValues, selectedDate, loadData) => {
    const [saving, setSaving] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);

    // Save a single cell instantly on blur/edit
    const saveSingleCell = useCallback(async (st, slotKey, value, recordId = "") => {
        if (value === '' || value === undefined || value === null || isNaN(parseFloat(value))) return;
        const numVal = parseFloat(value);
        const oldId = getStationId(st);
        const dateStr = selectedDate.format('YYYY-MM-DD');
        const timestamp = getSlotTimestamp(slotKey, selectedDate);

        try {
            const res = await stationApi.water.saveSingleGridData({
                station_type: st.type,
                station_id: Number(oldId),
                value: numVal,
                timestamp: timestamp.toISOString(),
                date: dateStr,
                record_id: recordId
            });
            
            // Extract returned record_id if available
            let newRecordId = recordId;
            if (res && res.data && res.data.record_id) {
                newRecordId = res.data.record_id;
            } else if (res && res.record_id) {
                newRecordId = res.record_id;
            }
            
            if (newRecordId) {
                setGridValues(prev => ({
                    ...prev,
                    [`${st.type}_${oldId}_${slotKey}_id`]: newRecordId
                }));
            }
        } catch (err) {
            console.error('Failed to save single water record cell:', err);
        }
    }, [selectedDate]);

    return {
        saving,
        editingGroup,
        setEditingGroup,
        saveSingleCell
    };
};
