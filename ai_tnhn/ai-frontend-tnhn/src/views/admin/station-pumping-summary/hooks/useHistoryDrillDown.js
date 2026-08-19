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
                if (Array.isArray(res.data)) {
                    setHistory(res.data);
                    setTotal(res.total ?? res.data.length);
                } else if (res.data.data && Array.isArray(res.data.data)) {
                    setHistory(res.data.data);
                    setTotal(res.data.total ?? res.data.data.length);
                } else {
                    setHistory([]);
                    setTotal(0);
                }
            } else if (Array.isArray(res)) {
                setHistory(res);
                setTotal(res.length);
            } else {
                setHistory([]);
                setTotal(0);
            }
        } catch (error) {
            console.error('Failed to fetch history', error);
            setHistory([]);
            setTotal(0);
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
        perPage,
        refetch: fetchHistory
    };
};

export default useHistoryDrillDown;
