import { useState, useEffect, useMemo } from 'react';
import axiosClient from 'api/axiosClient';

const useStationWaterSummaryV2 = () => {
    const [loading, setLoading] = useState(false);
    const [stations, setStations] = useState([]);
    const [activeTab, setActiveTab] = useState(0); // 0: Sông, 1: Hồ
    const [searchQuery, setSearchQuery] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get('/admin/water/summary-v2');
            if (res) {
                setStations(res || []);
            }
        } catch (err) {
            console.error('Lỗi tải dữ liệu bảng mực nước V2:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 6000); // 6 seconds
        return () => clearInterval(interval);
    }, []);

    const formatDateTime = (dateStr) => {
        if (!dateStr || dateStr === '-' || dateStr === '') return '...';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            const DD = String(d.getDate()).padStart(2, '0');
            const MM = String(d.getMonth() + 1).padStart(2, '0');
            const YYYY = d.getFullYear();
            return `${hh}:${mm} (${DD}/${MM}/${YYYY})`;
        } catch (e) {
            return dateStr;
        }
    };

    const tableData = useMemo(() => {
        return stations.map((station, index) => {
            const record = station.latest_record;
            return {
                id: station.id || String(station.old_id),
                stt: index + 1,
                name: station.ten_tram,
                nameHTML: '',
                thuTu: station.thu_tu || 0,
                type: station.loai === 'river' ? 'Sông' : 'Hồ',
                level: record?.value ?? 0,
                time: formatDateTime(record?.timestamp || '-'),
                rawTime: record?.timestamp || '-',
                date: record?.date || ''
            };
        });
    }, [stations]);

    const riverStations = useMemo(() => {
        return tableData.filter(d => d.type === 'Sông').sort((a, b) => a.thuTu - b.thuTu);
    }, [tableData]);

    const lakeStations = useMemo(() => {
        return tableData.filter(d => d.type === 'Hồ').sort((a, b) => a.thuTu - b.thuTu);
    }, [tableData]);

    const filteredData = useMemo(() => {
        const targetList = activeTab === 0 ? riverStations : lakeStations;
        if (!searchQuery.trim()) return targetList;

        const q = searchQuery.toLowerCase().trim();
        return targetList.filter(item =>
            item.name.toLowerCase().includes(q)
        );
    }, [activeTab, riverStations, lakeStations, searchQuery]);

    return {
        loading,
        activeTab,
        setActiveTab,
        searchQuery,
        setSearchQuery,
        riverStationsCount: riverStations.length,
        lakeStationsCount: lakeStations.length,
        filteredData,
        refresh: loadData
    };
};

export default useStationWaterSummaryV2;
