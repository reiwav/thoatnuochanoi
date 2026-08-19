import { useState, useEffect } from 'react';
import reportApi from 'api/report';
import toast from 'react-hot-toast';

const useWaterReportDetail = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        report_time: '',
        rain_time: '',
        rivers: [],
        lakes: []
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await reportApi.getWaterReportDetails();
            if (res) {
                setData(res);
            }
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu báo cáo:', error);
            toast.error('Không thể tải dữ liệu báo cáo Sông/Hồ.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return {
        loading,
        data,
        refresh: fetchData
    };
};

export default useWaterReportDetail;
