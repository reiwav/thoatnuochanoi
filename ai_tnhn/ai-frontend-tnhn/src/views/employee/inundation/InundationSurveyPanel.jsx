import React from 'react';
import {
    Box, Typography, Checkbox, FormControlLabel
} from '@mui/material';
import InundationCommonForm from './components/InundationCommonForm';

// Hook
import useInundationSurveyPanel from './hooks/useInundationSurveyPanel';

const InundationSurveyPanel = ({ report, pointId, onSuccess }) => {
    const {
        submitting,
        surveyData,
        setSurveyData,
        handleSubmit,
        watermarkText,
        oldImages
    } = useInundationSurveyPanel({ report, pointId, onSuccess });

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
