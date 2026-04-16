import React, { useState } from 'react';
import {
    Box, Typography, TextField, Checkbox, FormControlLabel,
    Button, Stack, CircularProgress
} from '@mui/material';
import { IconSend, IconCloudUpload } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import inundationApi from 'api/inundation';
import { processAndWatermark } from 'utils/imageProcessor';
import { getInundationImageUrl } from 'utils/imageHelper';

const InundationSurveyPanel = ({ report, pointId, onSuccess }) => {
    const [submitting, setSubmitting] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [surveyData, setSurveyData] = useState({
        checked: !!(report?.survey_checked || report?.surveyChecked),
        note: report?.survey_note || report?.surveyNote || '',
        images: []
    });

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setProcessing(true);
        try {
            const watermarkText = report?.street_name || new URLSearchParams(window.location.search).get('name') || '';
            const processedFiles = await Promise.all(files.map(file => processAndWatermark(file, watermarkText)));
            setSurveyData(prev => ({ ...prev, images: [...prev.images, ...processedFiles] }));
        } catch (error) {
            console.error('Lỗi xử lý ảnh:', error);
            toast.error('Không thể xử lý ảnh, vui lòng thử lại');
        } finally {
            setProcessing(false);
            e.target.value = '';
        }
    };

    // Sync state when report changes
    React.useEffect(() => {
        if (report) {
            setSurveyData(prev => ({
                ...prev,
                checked: !!(report.survey_checked || report.surveyChecked),
                note: report.survey_note || report.surveyNote || ''
            }));
        }
    }, [report]);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('survey_checked', String(surveyData.checked));
            formData.append('survey_note', surveyData.note);
            surveyData.images.forEach(img => {
                formData.append('images', img);
            });

            if (report?.id) {
                await inundationApi.updateSurvey(report.id, formData);
                toast.success('Cập nhật dữ liệu khảo sát thành công');
            } else if (pointId) {
                // If no report exists, create a new one with survey data
                formData.append('point_id', pointId);
                formData.append('status', 'active');
                // Also add required fields for new report
                formData.append('street_name', new URLSearchParams(window.location.search).get('name') || '');
                formData.append('start_time', Math.floor(Date.now() / 1000));
                
                await inundationApi.createReport(formData);
                toast.success('Đã tạo báo cáo và gửi dữ liệu khảo sát');
            } else {
                toast.error('Không xác định được điểm ngập');
                return;
            }
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Update survey error:', error);
            toast.error('Lỗi khi cập nhật dữ liệu khảo sát');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Box sx={{ p: 2 }}>
            <Stack spacing={3}>
                <FormControlLabel
                    control={<Checkbox checked={surveyData.checked} onChange={(e) => setSurveyData({ ...surveyData, checked: e.target.checked })} />}
                    label={<Typography sx={{ fontWeight: 700 }}>Đã khảo sát thiết kế</Typography>}
                />

                <Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 1, textTransform: 'uppercase' }}>
                        Ảnh hiện trường khảo sát:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                        <Button
                            component="label"
                            variant="outlined"
                            disabled={processing}
                            sx={{
                                width: 80, height: 80, borderRadius: 2,
                                border: '2px dashed', borderColor: 'divider',
                                display: 'flex', flexDirection: 'column', gap: 0.5
                            }}
                        >
                            {processing ? <CircularProgress size={20} color="secondary" /> : <IconCloudUpload size={24} color="#00bcd4" />}
                            <input type="file" hidden multiple accept="image/*" onChange={handleFileChange} />
                        </Button>

                        {surveyData.images.map((file, idx) => (
                            <Box
                                key={idx}
                                component="img"
                                src={URL.createObjectURL(file)}
                                sx={{ width: 80, height: 80, borderRadius: 2, objectFit: 'cover', border: '1px solid', borderColor: 'divider' }}
                            />
                        ))}

                        {/* Hiển thị ảnh cũ nếu có */}
                        {!surveyData.images.length && (report?.survey_images || report?.surveyImages)?.map((img, idx) => (
                            <Box
                                key={`old-${idx}`}
                                component="img"
                                src={getInundationImageUrl(img)}
                                sx={{ width: 80, height: 80, borderRadius: 2, objectFit: 'cover', border: '1px solid', borderColor: 'divider', opacity: 0.8 }}
                            />
                        ))}
                    </Stack>
                </Box>

                <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Ghi chú khảo sát"
                    placeholder="Nhập nội dung khảo sát thiết kế..."
                    value={surveyData.note}
                    onChange={(e) => setSurveyData({ ...surveyData, note: e.target.value })}
                    sx={{ '& .MuiInputLabel-root': { fontWeight: 800 } }}
                />

                <Button
                    variant="contained"
                    size="large"
                    disabled={submitting}
                    onClick={handleSubmit}
                    startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <IconSend size={20} />}
                    sx={{
                        borderRadius: 2,
                        py: 1.5,
                        fontWeight: 700,
                        bgcolor: '#00bcd4', // Cyan color for survey
                        '&:hover': { bgcolor: '#00acc1' }
                    }}
                >
                    GỬI KHẢO SÁT
                </Button>
            </Stack>
        </Box>
    );
};

export default InundationSurveyPanel;
