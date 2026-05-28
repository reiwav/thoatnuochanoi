import { useState, useEffect } from 'react';
import wastewaterTreatmentApi from 'api/wastewaterTreatment';

const useWastewaterTreatmentHistory = ({ item, open }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const response = await wastewaterTreatmentApi.getHistory(item.id);
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
        loading
    };
};

export default useWastewaterTreatmentHistory;
