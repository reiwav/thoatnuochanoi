import React, { useState } from 'react';
import {
    Box, Typography, TextField, Grid, Checkbox, FormControlLabel,
    Button, Stack, CircularProgress
} from '@mui/material';
import { IconSend, IconCloudUpload } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import inundationApi from 'api/inundation';
import { processAndWatermark } from 'utils/imageProcessor';

const InundationMechPanel = ({ report, pointId, onSuccess }) => {
    const [submitting, setSubmitting] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [mechData, setMechData] = useState({
        checked: !!(report?.mech_checked || report?.mechChecked),
        d: report?.mech_d || report?.mechD || '',
        r: report?.mech_r || report?.mechR || '',
        s: report?.mech_s || report?.mechS || '',
        note: report?.mech_note || report?.mechNote || '',
        images: []
    });

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setProcessing(true);
        try {
            const watermarkText = report?.street_name || new URLSearchParams(window.location.search).get('name') || '';
            const processedFiles = await Promise.all(files.map(file => processAndWatermark(file, watermarkText)));
            setMechData(prev => ({ ...prev, images: [...prev.images, ...processedFiles] }));
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
            setMechData(prev => ({
                ...prev,
                checked: !!(report.mech_checked || report.mechChecked),
                d: report.mech_d || report.mechD || '',
                r: report.mech_r || report.mechR || '',
                s: report.mech_s || report.mechS || '',
                note: report.mech_note || report.mechNote || ''
            }));
        }
    }, [report]);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('mech_checked', String(mechData.checked));
            formData.append('mech_d', mechData.d);
            formData.append('mech_r', mechData.r);
            formData.append('mech_s', mechData.s);
            formData.append('mech_note', mechData.note);
            mechData.images.forEach(img => {
                formData.append('images', img);
            });

            if (report?.id) {
                await inundationApi.updateMech(report.id, formData);
                toast.success('Cập nhật dữ liệu cơ giới thành công');
            } else if (pointId) {
                // If no report exists, create a new one with mech data
                formData.append('point_id', pointId);
                formData.append('status', 'active');
                // Also add required fields for new report
                formData.append('street_name', new URLSearchParams(window.location.search).get('name') || '');
                formData.append('start_time', Math.floor(Date.now() / 1000));
                
                await inundationApi.createReport(formData);
                toast.success('Đã tạo báo cáo và gửi dữ liệu cơ giới');
            } else {
                toast.error('Không xác định được điểm ngập');
                return;
            }
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Update mech error:', error);
            toast.error('Lỗi khi cập nhật dữ liệu cơ giới');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Box sx={{ p: 2 }}>
            <Stack spacing={3}>
                <FormControlLabel
                    control={<Checkbox checked={mechData.checked} onChange={(e) => setMechData({ ...mechData, checked: e.target.checked })} />}
                    label={<Typography sx={{ fontWeight: 700 }}>Đã ứng trực</Typography>}
                />

                <Grid container spacing={2}>
                    <Grid item xs={4}>
                        <TextField
                            fullWidth
                            label="Chiều sâu (D)"
                            size="small"
                            value={mechData.d}
                            onChange={(e) => setMechData({ ...mechData, d: e.target.value })}
                            placeholder="mm"
                            sx={{ '& .MuiInputLabel-root': { fontWeight: 800 } }}
                        />
                    </Grid>
                    <Grid item xs={4}>
                        <TextField
                            fullWidth
                            label="Chiều rộng (R)"
                            size="small"
                            value={mechData.r}
                            onChange={(e) => setMechData({ ...mechData, r: e.target.value })}
                            placeholder="m"
                            sx={{ '& .MuiInputLabel-root': { fontWeight: 800 } }}
                        />
                    </Grid>
                    <Grid item xs={4}>
                        <TextField
                            fullWidth
                            label="Diện tích (S)"
                            size="small"
                            value={mechData.s}
                            onChange={(e) => setMechData({ ...mechData, s: e.target.value })}
                            placeholder="m2"
                            sx={{ '& .MuiInputLabel-root': { fontWeight: 800 } }}
                        />
                    </Grid>
                </Grid>

                <Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 1, textTransform: 'uppercase' }}>
                        Ảnh hiện trường:
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
                            {processing ? <CircularProgress size={20} color="secondary" /> : <IconCloudUpload size={24} color="#2196f3" />}
                            <input type="file" hidden multiple accept="image/*" onChange={handleFileChange} />
                        </Button>

                        {mechData.images.map((file, idx) => (
                            <Box
                                key={idx}
                                component="img"
                                src={URL.createObjectURL(file)}
                                sx={{ width: 80, height: 80, borderRadius: 2, objectFit: 'cover', border: '1px solid', borderColor: 'divider' }}
                            />
                        ))}
                    </Stack>
                </Box>

                <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Thông tin khác"
                    placeholder="Nhập ghi chú thêm..."
                    value={mechData.note}
                    onChange={(e) => setMechData({ ...mechData, note: e.target.value })}
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
                        bgcolor: '#673ab7', // Deep Purple matches the image
                        '&:hover': { bgcolor: '#5e35b1' }
                    }}
                >
                    GỬI CẬP NHẬT
                </Button>
            </Stack>
        </Box>
    );
};

export default InundationMechPanel;
