import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import inundationApi from 'api/inundation';

const useInundationSurveyPanel = ({ report, pointId, onSuccess }) => {
    const [submitting, setSubmitting] = useState(false);
    const [surveyData, setSurveyData] = useState({
        survey_checked: !!(report?.survey_checked || report?.surveyChecked),
        survey_note: report?.survey_note || report?.surveyNote || '',
        survey_d: report?.survey_d || report?.surveyD || '',
        survey_r: report?.survey_r || report?.surveyR || '',
        survey_s: report?.survey_s || report?.surveyS || ''
    });

    // Đồng bộ state khi report thay đổi
    React.useEffect(() => {
        if (report) {
            setSurveyData(prev => ({
                ...prev,
                survey_checked: !!(report.survey_checked || report.surveyChecked),
                survey_note: report.survey_note || report.surveyNote || '',
                survey_d: report.survey_d || report.surveyD || '',
                survey_r: report.survey_r || report.surveyR || '',
                survey_s: report.survey_s || report.surveyS || ''
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
            formData.append('survey_checked', String(!!surveyData.survey_checked));
            formData.append('survey_note', surveyData.survey_note || '');
            formData.append('survey_d', surveyData.survey_d || '');
            formData.append('survey_r', surveyData.survey_r || '');
            formData.append('survey_s', surveyData.survey_s || '');
            images.forEach(img => {
                formData.append('images', img);
            });

            await inundationApi.reportSurvey(pId, formData);
            toast.success('Cập nhật dữ liệu khảo sát thành công');

            if (clearImagesCallback) clearImagesCallback();
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Update survey error:', error);
            toast.error('Lỗi khi cập nhật dữ liệu khảo sát');
        } finally {
            setSubmitting(false);
        }
    };

    const watermarkText = report?.street_name || new URLSearchParams(window.location.search).get('name') || '';
    const oldImages = report?.survey_images || report?.surveyImages || [];

    return {
        submitting,
        surveyData,
        setSurveyData,
        handleSubmit,
        watermarkText,
        oldImages
    };
};

export default useInundationSurveyPanel;
