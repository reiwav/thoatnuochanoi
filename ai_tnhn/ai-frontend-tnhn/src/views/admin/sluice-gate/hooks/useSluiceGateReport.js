import { useState, useEffect } from 'react';
import sluiceGateApi from 'api/sluiceGate';
import { toast } from 'react-hot-toast';

const useSluiceGateReport = ({ station, onSuccess }) => {
    const [formData, setFormData] = useState({ note: '', doors: [] });
    const [history, setHistory] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const perPage = 10;

    useEffect(() => {
        if (station) {
            const numDoors = station.quantity || 0;
            const initialDoors = [];
            for (let i = 0; i < numDoors; i++) {
                const existingState = station.doors?.[i];
                initialDoors.push(existingState !== undefined ? existingState : false);
            }
            setFormData({
                note: station.last_report?.note || '',
                doors: initialDoors
            });
        }
    }, [station]);

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await sluiceGateApi.getHistory(station.id, { page, per_page: perPage });
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
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (station?.id) fetchHistory();
    }, [station.id, page]);

    const handleSubmit = async () => {
        if (!formData.note.trim()) {
            toast.error('Vui lòng nhập nhận xét');
            return;
        }
        try {
            await sluiceGateApi.report(station.id, { 
                note: formData.note,
                doors: formData.doors
            });
            toast.success('Gửi báo cáo thành công');
            
            const numDoors = station.quantity || 0;
            const resetDoors = [];
            for (let i = 0; i < numDoors; i++) {
                const existingState = formData.doors?.[i];
                resetDoors.push(existingState !== undefined ? existingState : false);
            }
            setFormData({ note: '', doors: resetDoors });
            if (page === 1) {
                fetchHistory();
            } else {
                setPage(1);
            }
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Báo cáo thất bại');
        }
    };

    return {
        formData,
        setFormData,
        history,
        total,
        page,
        setPage,
        loadingHistory,
        handleSubmit,
        perPage
    };
};

export default useSluiceGateReport;
