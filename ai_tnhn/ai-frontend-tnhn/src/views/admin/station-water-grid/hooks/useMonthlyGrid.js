import { useState, useCallback, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import stationApi from 'api/station';
import organizationApi from 'api/organization';

const getStationId = (s) => s?.OldId ?? s?.old_id ?? s?.Id ?? s?.id ?? '';

export const useMonthlyGrid = () => {
    const [waterOrganizations, setWaterOrganizations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stations, setStations] = useState([]);
    const [gridData, setGridData] = useState({}); // format: { stationId_day_timeSlot: value }
    const [selectedMonth, setSelectedMonth] = useState(dayjs());
    const [stationTypeFilter, setStationTypeFilter] = useState('lake'); // 'lake' or 'river'
    const [selectedOrgId, setSelectedOrgId] = useState(''); // '' = tất cả

    const loadOrgs = useCallback(async () => {
        try {
            const orgRes = await organizationApi.getSelectionList();
            const orgList = [];
            if (orgRes) {
                if (Array.isArray(orgRes)) {
                    orgList.push(...orgRes);
                } else {
                    if (Array.isArray(orgRes.primary)) orgList.push(...orgRes.primary);
                    if (Array.isArray(orgRes.shared)) orgList.push(...orgRes.shared);
                }
            }
            setWaterOrganizations(orgList);
        } catch (error) {
            console.error('Failed to load orgs:', error);
        }
    }, []);

    useEffect(() => {
        loadOrgs();
    }, [loadOrgs]);

    const loadStations = useCallback(async () => {
        try {
            setLoading(true);
            const [lakesRes, riversRes] = await Promise.all([
                stationApi.lake.getAll({ per_page: 1000 }),
                stationApi.river.getAll({ per_page: 1000 })
            ]);
            
            let allStations = [];
            const extractData = (res, type) => {
                const data = res?.tram || res?.data || (Array.isArray(res) ? res : []);
                return data.map(s => ({ ...s, type }));
            };
            
            allStations = [
                ...extractData(lakesRes, 'lake'),
                ...extractData(riversRes, 'river')
            ];
            
            setStations(allStations);
        } catch (error) {
            console.error('Lỗi lấy danh sách trạm:', error);
            alert('Không thể lấy danh sách trạm');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStations();
    }, [loadStations]);

    const loadGridData = useCallback(async () => {
        if (!selectedMonth) return;
        try {
            const startOfMonth = selectedMonth.startOf('month').toISOString();
            const endOfMonth = selectedMonth.endOf('month').toISOString();
            
            const res = await stationApi.water.getGridData({
                start_time: startOfMonth,
                end_time: endOfMonth
            });
            
            const records = res?.data || res || [];
            if (Array.isArray(records)) {
                const newGridData = {};
                records.forEach(item => {
                    const stId = item.station_id;
                    const dateObj = dayjs(item.timestamp);
                    const day = dateObj.date();
                    const hour = dateObj.hour();
                    const minute = dateObj.minute();
                    
                    let slot = '';
                    // Map to 6h30 and 13h30
                    if (hour === 6 && minute === 30) slot = '6h30';
                    else if (hour === 13 && minute === 30) slot = '13h30';
                    
                    if (slot) {
                        newGridData[`${item.station_type}_${stId}_${day}_${slot}`] = item.value;
                        newGridData[`${item.station_type}_${stId}_${day}_${slot}_id`] = item.record_id;
                    }
                });
                setGridData(newGridData);
            }
        } catch (error) {
            console.error('Lỗi lấy dữ liệu lưới tháng:', error);
            alert('Không thể tải dữ liệu mực nước');
        }
    }, [selectedMonth]);

    useEffect(() => {
        loadGridData();
    }, [loadGridData]);

    const saveSingleCell = useCallback(async (station, day, timeSlot, valueStr, recordId = "") => {
        if (valueStr.trim() === '') return;
        
        const value = parseFloat(valueStr.replace(',', '.'));
        if (isNaN(value)) {
            alert('Giá trị không hợp lệ');
            return;
        }

        const oldId = getStationId(station);
        let hour = 6, minute = 30;
        if (timeSlot === '13h30') {
            hour = 13;
            minute = 30;
        }

        const targetDate = selectedMonth.date(day).hour(hour).minute(minute).second(0).millisecond(0);
        
        try {
            const res = await stationApi.water.saveSingleGridData({
                station_type: station.type,
                station_id: Number(oldId),
                value: value,
                timestamp: targetDate.toISOString(),
                record_id: recordId
            });
            
            // Extract returned record_id if available
            let newRecordId = recordId;
            if (res && res.data && res.data.record_id) {
                newRecordId = res.data.record_id;
            } else if (res && res.record_id) {
                newRecordId = res.record_id;
            }
            
            // Update local state
            setGridData(prev => ({
                ...prev,
                [`${station.type}_${oldId}_${day}_${timeSlot}`]: value,
                [`${station.type}_${oldId}_${day}_${timeSlot}_id`]: newRecordId
            }));
            
        } catch (error) {
            console.error('Lỗi lưu dữ liệu:', error);
            alert(error?.response?.data?.message || 'Có lỗi xảy ra khi lưu');
        }
    }, [selectedMonth]);

    const filteredStations = useMemo(() => {
        return stations.filter(s => s.type === stationTypeFilter);
    }, [stations, stationTypeFilter]);

    const groupedStations = useMemo(() => {
        const orgMap = {};
        (waterOrganizations || []).forEach(o => {
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

        let result = Object.values(groupsMap).sort((a, b) => 
            (a.orgName || '').localeCompare(b.orgName || '', 'vi', { numeric: true, sensitivity: 'base' })
        );

        if (unassigned.length > 0) {
            result.push({
                orgId: 'unassigned',
                orgName: 'Trạm khác / Chưa phân xí nghiệp',
                stations: unassigned
            });
        }

        // Lọc theo xí nghiệp nếu có chọn
        if (selectedOrgId) {
            result = result.filter(g => g.orgId === selectedOrgId);
        }

        return result;
    }, [filteredStations, waterOrganizations, selectedOrgId]);

    const daysInMonth = useMemo(() => {
        if (!selectedMonth) return [];

        const now = dayjs();
        const isCurrentMonth = selectedMonth.year() === now.year() && selectedMonth.month() === now.month();
        const isFutureMonth = selectedMonth.isAfter(now, 'month');

        let daysCount = selectedMonth.daysInMonth();

        if (isFutureMonth) {
            daysCount = 0;
        } else if (isCurrentMonth) {
            daysCount = now.date();
        }

        const days = [];
        for (let i = 1; i <= daysCount; i++) {
            days.push(i);
        }
        return days;
    }, [selectedMonth]);

    const riverCount = useMemo(() => stations.filter(s => s.type === 'river').length, [stations]);
    const lakeCount = useMemo(() => stations.filter(s => s.type === 'lake').length, [stations]);

    // Danh sách xí nghiệp cho dropdown lọc (hiển thị tất cả xí nghiệp có trạm)
    const orgOptions = useMemo(() => {
        const orgMap = {};
        (waterOrganizations || []).forEach(o => {
            if (o.id) orgMap[o.id] = o;
        });

        const seen = new Set();
        const options = [];
        stations.forEach(st => {
            const orgId = st.org_id;
            if (orgId && !seen.has(orgId) && orgMap[orgId]) {
                seen.add(orgId);
                const org = orgMap[orgId];
                options.push({ id: orgId, name: org.name || org.name_display || orgId });
            }
        });
        options.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi', { numeric: true, sensitivity: 'base' }));
        return options;
    }, [stations, waterOrganizations]);

    return {
        loading,
        daysInMonth,
        groupedStations,
        gridData,
        selectedMonth,
        setSelectedMonth,
        stationTypeFilter,
        setStationTypeFilter,
        selectedOrgId,
        setSelectedOrgId,
        orgOptions,
        saveSingleCell,
        riverCount,
        lakeCount
    };
};
