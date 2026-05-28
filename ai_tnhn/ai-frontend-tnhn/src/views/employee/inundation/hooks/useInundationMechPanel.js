import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import inundationApi from 'api/inundation';

const useInundationMechPanel = ({ report, pointId, onSuccess }) => {
    const [submitting, setSubmitting] = useState(false);
    const [mechData, setMechData] = useState({
        mech_checked: !!(report?.mech_checked || report?.mechChecked),
        mech_d: report?.mech_d || report?.mechD || '',
        mech_r: report?.mech_r || report?.mechR || '',
        mech_s: report?.mech_s || report?.mechS || '',
        mech_note: report?.mech_note || report?.mechNote || ''
    });

    // Đồng bộ state khi report thay đổi
    React.useEffect(() => {
        if (report) {
            setMechData(prev => ({
                ...prev,
                mech_checked: !!(report.mech_checked || report.mechChecked),
                mech_d: report.mech_d || report.mechD || '',
                mech_r: report.mech_r || report.mechR || '',
                mech_s: report.mech_s || report.mechS || '',
                mech_note: report.mech_note || report.mechNote || ''
            }));
        }
    }, [report]);

    const handleSubmit = async (images, clearImagesCallback) => {
        const pId = pointId || report?.point_id || report?.pointID;
        if (!pId) {
            toast.error('Không xác định được điểm ngập');
            return;
        }
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('mech_checked', String(!!mechData.mech_checked));
            formData.append('mech_d', mechData.mech_d || '');
            formData.append('mech_r', mechData.mech_r || '');
            formData.append('mech_s', mechData.mech_s || '');
            formData.append('mech_note', mechData.mech_note || '');
            images.forEach(img => {
                formData.append('images', img);
            });

            await inundationApi.reportMech(pId, formData);
            toast.success('Cập nhật dữ liệu cơ giới thành công');

            if (clearImagesCallback) clearImagesCallback();
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Update mech error:', error);
            toast.error('Lỗi khi cập nhật dữ liệu cơ giới');
        } finally {
            setSubmitting(false);
        }
    };

    const watermarkText = report?.street_name || new URLSearchParams(window.location.search).get('name') || '';
    const oldImages = report?.mech_images || report?.mechImages || [];

    return {
        submitting,
        mechData,
        setMechData,
        handleSubmit,
        watermarkText,
        oldImages
    };
};

export default useInundationMechPanel;
