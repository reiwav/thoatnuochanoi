import React, { useState } from 'react';
import {
    Box, Typography, Checkbox, FormControlLabel
} from '@mui/material';
import { toast } from 'react-hot-toast';
import inundationApi from 'api/inundation';
import InundationCommonForm from './components/InundationCommonForm';

const InundationSurveyPanel = ({ report, pointId, onSuccess }) => {
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

    return (
        <Box sx={{ p: 2 }}>
            <InundationCommonForm
                watermarkText={watermarkText}
                oldImages={oldImages}
                onSubmit={handleSubmit}
                submitText="GỬI KHẢO SÁT"
                submitColor="cyan"
                loading={submitting}
                noteValue={surveyData.survey_note}
                onNoteChange={(e) => setSurveyData(prev => ({ ...prev, survey_note: e.target.value }))}
                noteLabel="Ghi chú khảo sát"
                notePlaceholder="Nhập nội dung XN KSTK"
                noteRows={4}
                depth={surveyData.survey_d}
                onDepthChange={(val) => setSurveyData(prev => ({ ...prev, survey_d: val }))}
                width={surveyData.survey_r}
                onWidthChange={(val) => setSurveyData(prev => ({ ...prev, survey_r: val }))}
                length={surveyData.survey_s}
                onLengthChange={(val) => setSurveyData(prev => ({ ...prev, survey_s: val }))}
                permission="inundation:survey"
            >
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={surveyData.survey_checked}
                            onChange={(e) => setSurveyData(prev => ({ ...prev, survey_checked: e.target.checked }))}
                        />
                    }
                    label={<Typography sx={{ fontWeight: 700 }}>Đã khảo sát thiết kế</Typography>}
                />
            </InundationCommonForm>
        </Box>
    );
};

export default InundationSurveyPanel;
