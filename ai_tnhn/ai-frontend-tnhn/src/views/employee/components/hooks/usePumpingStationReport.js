import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';

import pumpingStationApi from 'api/pumpingStation';

const usePumpingStationReport = ({ station }) => {
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

    const handleAdjust = (name, delta) => {
        const newValue = Math.max(0, (formData[name] || 0) + delta);
        // Validation: total cannot exceed pump_count
        const othersSum = totalPumped - (formData[name] || 0);
        if (othersSum + newValue > station.pump_count) {
            toast.error(`Tổng số máy bơm không thể vượt quá định mức ${station.pump_count} máy`);
            return;
        }
        setFormData({ ...formData, [name]: newValue });
    };

    const handleSubmit = async (onSuccess) => {
        try {
            const payload = {
                station_id: station.id,
                operating_count: formData.operating_count,
                closed_count: formData.closed_count,
                maintenance_count: formData.maintenance_count,
                no_signal_count: formData.no_signal_count,
                note: formData.note
            };

            if (totalPumped !== station.pump_count) {
                toast.error(`Tổng số máy bơm (${totalPumped}) phải bằng định mức (${station.pump_count})`);
                return;
            }

            await pumpingStationApi.report(payload);
            toast.success('Gửi báo cáo thành công');

            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Báo cáo thất bại');
        }
    };

    return {
        formData,
        setFormData,
        totalPumped,
        remainingCount,
        handleAdjust,
        handleSubmit
    };
};

export default usePumpingStationReport;
