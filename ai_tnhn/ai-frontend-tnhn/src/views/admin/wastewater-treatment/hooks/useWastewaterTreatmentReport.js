import { useState, useEffect } from 'react';
import wastewaterTreatmentApi from 'api/wastewaterTreatment';
import { toast } from 'react-hot-toast';

const useWastewaterTreatmentReport = ({ station, onSuccess }) => {
    const [formData, setFormData] = useState({
        note: ''
    });
    const [history, setHistory] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const perPage = 10;

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await wastewaterTreatmentApi.getHistory(station.id, { 
                page: page, 
                per_page: perPage 
            });
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
        if (station?.id) {
            fetchHistory();
        }
    }, [station?.id, page]);

    const handleSubmit = async () => {
        if (!formData.note.trim()) {
            toast.error('Vui lòng nhập nhận xét');
            return;
        }

        try {
            const payload = {
                note: formData.note
            };

            await wastewaterTreatmentApi.report(station.id, payload);
            toast.success('Gửi báo cáo thành công');
            setFormData({ note: '' });
            
            if (page === 1) {
                fetchHistory();
            } else {
                setPage(1);
            }
            
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Báo cáo thất bại');
        }
    };

    const handlePageChange = (event, value) => {
        setPage(value);
    };

    return {
        formData,
        setFormData,
        history,
        total,
        page,
        loadingHistory,
        perPage,
        handleSubmit,
        handlePageChange
    };
};

export default useWastewaterTreatmentReport;
