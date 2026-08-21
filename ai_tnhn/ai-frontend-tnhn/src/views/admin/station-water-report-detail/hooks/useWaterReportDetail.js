import { useState, useEffect } from 'react';
import reportApi from 'api/report';
import toast from 'react-hot-toast';

const useWaterReportDetail = () => {
    const [loading, setLoading] = useState(false);
    const [selectedTime, setSelectedTime] = useState(null);
    const [data, setData] = useState({
        report_time: '',
        rain_time: '',
        rivers: [],
        lakes: []
    });

    const fetchData = async (customTime = null) => {
        setLoading(true);
        try {
            const res = await reportApi.getWaterReportDetails(customTime);
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



    return {
        loading,
        data,
        refresh: fetchData,
        selectedTime,
        setSelectedTime
    };
};

export default useWaterReportDetail;
