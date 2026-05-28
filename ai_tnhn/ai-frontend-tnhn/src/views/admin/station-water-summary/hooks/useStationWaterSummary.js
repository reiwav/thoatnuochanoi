import { useState, useEffect } from 'react';
import axiosClient from 'api/axiosClient';

const useStationWaterSummary = () => {
    const [loading, setLoading] = useState(false);
    const [stations, setStations] = useState([]);
    const [waterData, setWaterData] = useState([]);
    const [tabValue, setTabValue] = useState(0);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get('/admin/weather/water');
            if (res) {
                const tramList = res.tram || [];
                const dataList = res.data || [];

                setStations(tramList);
                setWaterData(dataList);
            }
        } catch (err) {
            console.error('Lỗi tải dữ liệu bảng mực nước:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 6000); // 6 seconds
        return () => clearInterval(interval);
    }, []);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

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

    const getTableData = () => {
        const dataMap = new Map();
        waterData.forEach(d => {
            dataMap.set(d.TramId, d);
        });

        return stations.map((station, index) => {
            const wd = dataMap.get(station.Id);
            const level = wd?.ThuongLuu_HT ?? 0;
            const time = wd?.ThoiGian_HT || '-';

            return {
                id: station.Id,
                stt: index + 1,
                name: station.TenTram,
                nameHTML: station.TenTramHTML || '',
                thuTu: station.ThuTu || 0,
                type: station.Loai === "1" ? "Sông" : "Hồ",
                level: level,
                time: formatDateTime(time),
                rawTime: time
            };
        });
    };

    const tableData = getTableData();
    const riverStations = tableData.filter(d => d.type === "Sông").sort((a, b) => a.thuTu - b.thuTu);
    const lakeStations = tableData.filter(d => d.type === "Hồ").sort((a, b) => a.thuTu - b.thuTu);

    const activeData = tabValue === 0 ? riverStations : lakeStations;

    return {
        loading,
        tabValue,
        handleTabChange,
        tableData,
        riverStations,
        lakeStations,
        activeData
    };
};

export default useStationWaterSummary;
