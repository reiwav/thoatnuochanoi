import { useState, useEffect, useMemo } from 'react';
import pumpingStationApi from 'api/pumpingStation';
import { toast } from 'react-hot-toast';

export const usePumpingStationReport = ({ station, onSuccess }) => {
    const [openHistory, setOpenHistory] = useState(false);
    const [formData, setFormData] = useState({
        operating_count: station.last_report?.operating_count || 0,
        closed_count: station.last_report?.closed_count || 0,
        maintenance_count: station.last_report?.maintenance_count || 0,
        no_signal_count: station.last_report?.no_signal_count || 0,
        note: station.last_report?.note || ''
    });

    // Cập nhật formData khi station thay đổi (ví dụ sau khi reload dữ liệu)
    useEffect(() => {
        if (station?.last_report) {
            setFormData({
                operating_count: station.last_report.operating_count || 0,
                closed_count: station.last_report.closed_count || 0,
                maintenance_count: station.last_report.maintenance_count || 0,
                no_signal_count: station.last_report.no_signal_count || 0,
                note: station.last_report.note || ''
            });
        }
    }, [station]);

    const totalPumped = useMemo(() => {
        return Number(formData.operating_count) + Number(formData.closed_count) + Number(formData.maintenance_count) + Number(formData.no_signal_count);
    }, [formData]);

    const remainingCount = station.pump_count - totalPumped;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: Number(value) }));
    };

    const handleSubmit = async () => {
        try {
            const payload = {
                station_id: station.id,
                operating_count: formData.operating_count,
                closed_count: formData.closed_count,
                maintenance_count: formData.maintenance_count,
                no_signal_count: formData.no_signal_count,
                note: formData.note
            };

            if (totalPumped > station.pump_count) {
                toast.error(`Tổng số máy bơm (${totalPumped}) vượt quá định mức (${station.pump_count})`);
                return;
            }

            await pumpingStationApi.report(payload);
            toast.success('Gửi báo cáo thành công');

            // Nếu có hàm callback thì gọi để Dashboard refresh lại dữ liệu station mới nhất
            if (onSuccess) {
                onSuccess();
            } else {
                setFormData({ operating_count: 0, closed_count: 0, maintenance_count: 0, no_signal_count: 0, note: '' });
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Báo cáo thất bại');
        }
    };

    // Helper to generate options based on availability
    const getOptions = (currentField) => {
        const othersSum = totalPumped - Number(formData[currentField]);
        const maxAvailable = station.pump_count - othersSum;
        return Array.from({ length: maxAvailable + 1 }, (_, i) => i);
    };

    return {
        openHistory,
        setOpenHistory,
        formData,
        setFormData,
        totalPumped,
        remainingCount,
        handleChange,
        handleSubmit,
        getOptions
    };
};
