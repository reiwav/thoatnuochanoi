import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import dayjs from 'dayjs';
import stationApi from 'api/station';

export const getStationId = (s) => s?.OldId ?? s?.old_id ?? s?.OldID ?? s?.Id ?? s?.id ?? '';

const useStationHistory = ({ type }) => {
    const theme = useTheme();
    const [searchParams, setSearchParams] = useSearchParams();
    const stationIdParam = searchParams.get('id');

    const [loading, setLoading] = useState(false);
    const [stations, setStations] = useState([]);
    const [selectedStation, setSelectedStation] = useState('');
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [history, setHistory] = useState([]);

    const loadStations = useCallback(async () => {
        try {
            const apiMap = {
                rain: stationApi.rain,
                lake: stationApi.lake,
                river: stationApi.river
            };
            const res = await apiMap[type].getAll({ per_page: 1000 });
            if (res) {
                const data = res.tram || res.data || (Array.isArray(res) ? res : []);
                setStations(data);
                if (data.length > 0) {
                    const initialId = stationIdParam || getStationId(data[0]);
                    setSelectedStation(initialId);
                }
            }
        } catch (err) {
            console.error('Failed to load stations:', err);
        }
    }, [type, stationIdParam]);

    const handleStationChange = (e) => {
        const val = e.target.value;
        setSelectedStation(val);
        setSearchParams({ id: val });
    };

    const loadHistory = useCallback(async () => {
        if (!selectedStation) return;
        setLoading(true);
        setHistory([]);
        try {
            const apiMap = {
                rain: stationApi.rain,
                lake: stationApi.lake,
                river: stationApi.river
            };
            const params = { limit: 500 };
            if (selectedDate) {
                params.date = selectedDate.format('YYYY-MM-DD');
            }
            const res = await apiMap[type].getHistory(selectedStation, params);
            if (res) {
                setHistory(Array.isArray(res) ? res : (res.data || []));
            }
        } catch (err) {
            console.error('Failed to load history:', err);
            setHistory([]);
        } finally {
            setLoading(false);
        }
    }, [type, selectedStation, selectedDate]);

    useEffect(() => { loadStations(); }, [loadStations]);
    useEffect(() => { loadHistory(); }, [loadHistory]);

    const getTitle = () => {
        switch (type) {
            case 'rain': return 'Lịch sử đo mưa';
            case 'lake': return 'Lịch sử mực nước hồ';
            case 'river': return 'Lịch sử mực nước sông';
            default: return 'Lịch sử đo đạc';
        }
    };

    const getValueLabel = () => {
        switch (type) {
            case 'rain': return 'Lượng mưa (mm)';
            case 'lake': return 'Mực nước (m)';
            case 'river': return 'Mực nước (m)';
            default: return 'Giá trị';
        }
    };

    const activeData = useMemo(() => {
        if (!history || history.length === 0) return [];
        if (type !== 'rain') return [...history].reverse();
        
        return [...history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }, [history, type]);

    const chartOptions = useMemo(() => {
        const isRain = type === 'rain';
        const options = {
            chart: {
                type: 'line',
                height: 350,
                toolbar: { show: false },
                zoom: { enabled: false },
                fontFamily: theme.typography.fontFamily
            },
            dataLabels: { enabled: false },
            stroke: { 
                curve: isRain ? 'straight' : 'smooth', 
                width: isRain ? 2 : 3 
            },
            markers: {
                size: isRain ? 0 : (activeData.length <= 1 ? 5 : 0),
                strokeWidth: 2,
                hover: { size: isRain ? 5 : 6 }
            },
            fill: {
                type: 'solid'
            },
            xaxis: {
                type: 'datetime',
                labels: {
                    datetimeUTC: false,
                    format: isRain ? 'H' : 'HH:mm'
                },
                title: { text: isRain ? '' : 'Thời gian' }
            },
            yaxis: {
                min: 0,
                title: { text: isRain ? '' : getValueLabel() }
            },
            tooltip: {
                x: { format: 'dd/MM/yyyy HH:mm' }
            },
            colors: [theme.palette.primary.main]
        };

        if (isRain) {
            const dateStr = selectedDate ? selectedDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
            options.xaxis.min = dayjs(dateStr).hour(7).minute(0).second(0).valueOf();
            options.xaxis.max = dayjs(dateStr).add(1, 'day').hour(7).minute(0).second(0).valueOf();
            options.xaxis.tickAmount = 24;
            options.xaxis.tooltip = { enabled: false };
            options.yaxis.min = 0;
            options.yaxis.tickAmount = 12;
            options.yaxis.labels = {
                formatter: (val) => val.toFixed(0)
            };
            options.grid = {
                borderColor: theme.palette.divider,
                strokeDashArray: 0,
                xaxis: { lines: { show: true } },
                yaxis: { lines: { show: true } }
            };
            options.legend = {
                show: true,
                position: 'top',
                horizontalAlign: 'center',
                markers: { radius: 0 }
            };
        }

        return options;
    }, [theme, type, activeData.length, selectedDate]);

    const chartSeries = useMemo(() => {
        let data = activeData.map(item => ({
            x: new Date(item.timestamp).getTime(),
            y: item.value || 0
        }));

        return [{
            name: getValueLabel(),
            data: data
        }];
    }, [activeData, type, selectedDate]);

    return {
        loading,
        stations,
        selectedStation,
        selectedDate,
        setSelectedDate,
        history,
        handleStationChange,
        getTitle,
        getValueLabel,
        activeData,
        chartOptions,
        chartSeries
    };
};

export default useStationHistory;
