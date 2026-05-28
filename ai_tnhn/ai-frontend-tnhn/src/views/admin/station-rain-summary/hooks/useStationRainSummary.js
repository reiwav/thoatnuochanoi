import { useState, useEffect } from 'react';
import axiosClient from 'api/axiosClient';

const useStationRainSummary = () => {
    const [loading, setLoading] = useState(false);
    const [stations, setStations] = useState([]);
    const [weatherData, setWeatherData] = useState([]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get('/admin/weather/rain');
            if (res) {
                const tramList = res.tram || [];
                const dataList = res.data || [];

                setStations(tramList);
                setWeatherData(dataList);
            }
        } catch (err) {
            console.error('Lỗi tải dữ liệu bảng mưa:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 6000); // 6 seconds
        return () => clearInterval(interval);
    }, []);

    // Format date string from 2026-03-09T04:40:11 to HH:mm (DD/MM/YYYY)
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

    const formatTimeOnly = (dateStr) => {
        if (!dateStr || dateStr === '-' || dateStr === '') return '...';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) {
                if (dateStr.length > 16) return dateStr.substring(11, 16);
                return dateStr;
            }
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            return `${hh}:${mm}`;
        } catch (e) {
            return dateStr;
        }
    };

    const getTableData = () => {
        const dataMap = new Map();
        weatherData.forEach(d => {
            const tid = typeof d.TramId === 'number' ? d.TramId.toString() : d.TramId;
            dataMap.set(tid, d);
        });

        return stations.map((station, index) => {
            const tid = typeof station.Id === 'number' ? station.Id.toString() : station.Id;
            const wd = dataMap.get(tid);

            let startTime = wd?.ThoiGian_BD || '-';
            let currentTime = wd?.ThoiGian_HT || '-';

            const rainCurrent = wd?.LuongMua_HT ?? 0;
            const rainStart = wd?.LuongMua_BD ?? 0;
            const rainSession = rainCurrent;

            let isRaining = rainSession > 0;
            if (isRaining && currentTime !== '-') {
                const dataTime = new Date(currentTime).getTime();
                if (!isNaN(dataTime)) {
                    const diffMinutes = (Date.now() - dataTime) / (1000 * 60);
                    if (diffMinutes > 5) {
                        isRaining = false;
                    }
                }
            }

            return {
                id: tid,
                stt: index + 1,
                name: station.TenPhuong,
                address: station.DiaChi,
                thuTu: station.ThuTu || 0,
                startTimeRaw: startTime,
                currentTimeRaw: currentTime,
                startTime: formatDateTime(startTime),
                currentTime: formatDateTime(currentTime),
                timeStartOnly: formatTimeOnly(startTime),
                timeCurrentOnly: formatTimeOnly(currentTime),
                rainStart: rainStart,
                rainCurrent: rainCurrent,
                rainSession: rainSession,
                isRaining: isRaining
            };
        });
    };

    const tableData = getTableData().sort((a, b) => a.thuTu - b.thuTu);
    const rainingCount = tableData.filter(d => d.isRaining).length;
    const notRainingCount = tableData.length - rainingCount;

    const [chartOpen, setChartOpen] = useState(false);
    const [chartLoading, setChartLoading] = useState(false);
    const [chartData, setChartData] = useState([]);
    const [chartStationName, setChartStationName] = useState('');
    const [chartDate, setChartDate] = useState('');

    const handleOpenChart = async (stationId, stationName) => {
        const todayStr = new Date().toISOString().split('T')[0];
        setChartStationName(stationName);
        setChartDate(todayStr);
        setChartOpen(true);
        setChartLoading(true);
        setChartData([]);
        
        try {
            const res = await axiosClient.get(`/admin/water/rain/${stationId}/history`, {
                params: { date: todayStr, limit: 1000 }
            });
            if (res) {
                setChartData(Array.isArray(res) ? res : (res.data || []));
            }
        } catch (err) {
            console.error('Lỗi tải lịch sử đo mưa cho popup:', err);
            setChartData([]);
        } finally {
            setChartLoading(false);
        }
    };

    const handleCloseChart = () => {
        setChartOpen(false);
    };

    return {
        loading,
        tableData,
        rainingCount,
        notRainingCount,
        chartOpen,
        chartLoading,
        chartData,
        chartStationName,
        chartDate,
        handleOpenChart,
        handleCloseChart
    };
};

export default useStationRainSummary;
