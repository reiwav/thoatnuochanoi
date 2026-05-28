import { useState, useEffect } from 'react';
import sluiceGateApi from 'api/sluiceGate';

const useSluiceGateHistory = ({ open, item }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const response = await sluiceGateApi.getHistory(item.id);
            setHistory(response.data || response || []);
        } catch (error) {
            console.error('Failed to load history', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && item) {
            loadHistory();
        }
    }, [open, item]);

    return {
        history,
        loading,
        loadHistory
    };
};

export default useSluiceGateHistory;
