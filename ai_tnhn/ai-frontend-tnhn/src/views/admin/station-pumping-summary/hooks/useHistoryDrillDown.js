import { useState, useEffect } from 'react';
import pumpingStationApi from 'api/pumpingStation';
import wastewaterTreatmentApi from 'api/wastewaterTreatment';

const useHistoryDrillDown = ({ station }) => {
    const [history, setHistory] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const perPage = 10;

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await (station.pump_count !== undefined 
                ? pumpingStationApi.getHistory(station.id, { page, per_page: perPage })
                : wastewaterTreatmentApi.getHistory(station.id, { page, per_page: perPage }));
            
            if (res && res.data) {
                setHistory(res.data);
                setTotal(res.total || 0);
            } else if (Array.isArray(res)) {
                setHistory(res);
                setTotal(res.length);
            }
        } catch (error) {
            console.error('Failed to fetch history', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (station?.id) {
            fetchHistory();
        }
    }, [station?.id, page]);

    return {
        history,
        total,
        page,
        setPage,
        loading,
        perPage
    };
};

export default useHistoryDrillDown;
