import React, { useState } from 'react';
import {
    Box, Stack, TextField, Button, Checkbox, FormControlLabel,
    Typography, IconButton, CircularProgress, Grid
} from '@mui/material';
import { IconCloudUpload, IconX, IconSend, IconMessage2 } from '@tabler/icons-react';
import { useTheme } from '@mui/material/styles';
import { processAndWatermark } from 'utils/imageProcessor';
import { getInundationImageUrl } from 'utils/imageHelper';
import useInundationStore from 'store/useInundationStore';

export const SurveyActionForm = ({ point, onFinished }) => {
    const theme = useTheme();
    const updateSurvey = useInundationStore(state => state.updateSurvey);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({
        checked: point.active_report?.survey_checked || false,
        note: point.active_report?.survey_note || '',
        images: [],
        previews: []
    });

    const handleImageChange = async (e) => {
        const pickedFiles = Array.from(e.target.files);
        if (pickedFiles.length === 0) return;
        try {
            const processedFiles = await Promise.all(pickedFiles.map(file => processAndWatermark(file, point.name)));
            setData(prev => ({
                ...prev,
                images: [...prev.images, ...processedFiles],
                previews: [...prev.previews, ...processedFiles.map(file => URL.createObjectURL(file))]
            }));
        } catch (error) {
            console.error('Error processing survey images:', error);
        }
    };

    const handleSubmit = async () => {
        if (!point.active_report) return;
        setLoading(true);
        const fd = new FormData();
        fd.append('survey_checked', data.checked);
        fd.append('survey_note', data.note);
        data.images.forEach(img => fd.append('images', img));
        
        const success = await updateSurvey(point.active_report.id, fd);
        setLoading(false);
        if (success && onFinished) onFinished();
    };

    return (
        <Stack spacing={2} sx={{ p: 1 }}>
            <FormControlLabel
                control={<Checkbox size="small" checked={data.checked} onChange={(e) => setData({ ...data, checked: e.target.checked })} />}
                label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Đã kiểm tra</Typography>}
            />
            <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', mb: 1, display: 'block' }}>ẢNH HIỆN TRƯỜNG:</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    <Box component="label" sx={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed', borderColor: 'divider', borderRadius: 1, cursor: 'pointer', bgcolor: 'grey.50' }}>
                        <input type="file" hidden multiple accept="image/*" onChange={handleImageChange} />
                        <IconCloudUpload size={20} color={theme.palette.primary.main} />
                    </Box>
                    {data.previews.map((src, i) => (
                        <Box key={i} sx={{ position: 'relative', width: 48, height: 48 }}>
                            <Box component="img" src={src} sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }} />
                            <IconButton size="small" onClick={() => {
                                const ni = [...data.images]; ni.splice(i, 1);
                                const np = [...data.previews]; URL.revokeObjectURL(np[i]); np.splice(i, 1);
                                setData({ ...data, images: ni, previews: np });
                            }} sx={{ position: 'absolute', top: -4, right: -4, bgcolor: 'error.main', color: 'white', p: 0.1 }}>
                                <IconX size={8} />
                            </IconButton>
                        </Box>
                    ))}
                </Box>
            </Box>
            <TextField
                fullWidth label="Ghi chú XNTK" multiline rows={2} size="small"
                value={data.note} onChange={(e) => setData({ ...data, note: e.target.value })}
            />
            <Button
                fullWidth variant="contained" onClick={handleSubmit}
                disabled={loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <IconSend size={16} />}
                sx={{ borderRadius: 2, fontWeight: 800 }}
            >
                GỬI CẬP NHẬT XNTK
            </Button>
        </Stack>
    );
};

export const MechActionForm = ({ point, onFinished }) => {
    const theme = useTheme();
    const updateMech = useInundationStore(state => state.updateMech);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({
        checked: point.active_report?.mech_checked || false,
        note: point.active_report?.mech_note || '',
        d: point.active_report?.mech_d || '',
        r: point.active_report?.mech_r || '',
        s: point.active_report?.mech_s || '',
        images: [],
        previews: []
    });

    const handleImageChange = async (e) => {
        const pickedFiles = Array.from(e.target.files);
        if (pickedFiles.length === 0) return;
        try {
            const processedFiles = await Promise.all(pickedFiles.map(file => processAndWatermark(file, point.name)));
            setData(prev => ({
                ...prev,
                images: [...prev.images, ...processedFiles],
                previews: [...prev.previews, ...processedFiles.map(file => URL.createObjectURL(file))]
            }));
        } catch (error) {
            console.error('Error processing mech images:', error);
        }
    };

    const handleSubmit = async () => {
        if (!point.active_report) return;
        setLoading(true);
        const fd = new FormData();
        fd.append('mech_checked', data.checked);
        fd.append('mech_note', data.note);
        fd.append('mech_d', data.d);
        fd.append('mech_r', data.r);
        fd.append('mech_s', data.s);
        data.images.forEach(img => fd.append('images', img));
        
        const success = await updateMech(point.active_report.id, fd);
        setLoading(false);
        if (success && onFinished) onFinished();
    };

    return (
        <Stack spacing={2} sx={{ p: 1 }}>
            <FormControlLabel
                control={<Checkbox size="small" checked={data.checked} onChange={(e) => setData({ ...data, checked: e.target.checked })} />}
                label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Đã ứng trực</Typography>}
            />
            <Grid container spacing={1}>
                {['d', 'r', 's'].map(field => (
                    <Grid item xs={4} key={field}>
                        <TextField fullWidth label={field.toUpperCase()} size="small" value={data[field]} onChange={(e) => setData({ ...data, [field]: e.target.value })} />
                    </Grid>
                ))}
            </Grid>
            <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', mb: 1, display: 'block' }}>ẢNH HIỆN TRƯỜNG:</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    <Box component="label" sx={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed', borderColor: 'divider', borderRadius: 1, cursor: 'pointer', bgcolor: 'grey.50' }}>
                        <input type="file" hidden multiple accept="image/*" onChange={handleImageChange} />
                        <IconCloudUpload size={20} color={theme.palette.secondary.main} />
                    </Box>
                    {data.previews.map((src, i) => (
                        <Box key={i} sx={{ position: 'relative', width: 48, height: 48 }}>
                            <Box component="img" src={src} sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }} />
                            <IconButton size="small" onClick={() => {
                                const ni = [...data.images]; ni.splice(i, 1);
                                const np = [...data.previews]; URL.revokeObjectURL(np[i]); np.splice(i, 1);
                                setData({ ...data, images: ni, previews: np });
                            }} sx={{ position: 'absolute', top: -4, right: -4, bgcolor: 'error.main', color: 'white', p: 0.1 }}>
                                <IconX size={8} />
                            </IconButton>
                        </Box>
                    ))}
                </Box>
            </Box>
            <TextField
                fullWidth label="Ghi chú Cơ giới" multiline rows={2} size="small"
                value={data.note} onChange={(e) => setData({ ...data, note: e.target.value })}
            />
            <Button
                fullWidth variant="contained" color="secondary" onClick={handleSubmit}
                disabled={loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <IconSend size={16} />}
                sx={{ borderRadius: 2, fontWeight: 800 }}
            >
                GỬI CẬP NHẬT CƠ GIỚI
            </Button>
        </Stack>
    );
};

export const ReviewActionForm = ({ point, onFinished }) => {
    const reviewReport = useInundationStore(state => state.reviewReport);
    const [loading, setLoading] = useState(false);
    const [comment, setComment] = useState('');

    const handleSubmit = async () => {
        if (!point.active_report || !comment.trim()) return;
        setLoading(true);
        const report = point.active_report;
        const updates = report.updates || [];
        const isUpdate = updates.length > 0;
        const targetId = isUpdate ? [...updates].sort((a, b) => b.timestamp - a.timestamp)[0].id : report.id;

        const success = await reviewReport(targetId, comment, isUpdate);
        setLoading(false);
        if (success) {
            setComment('');
            if (onFinished) onFinished();
        }
    };

    const latest = point.active_report || point.last_report;

    if (latest?.needs_correction) {
        return (
            <Box sx={{ p: 1.5, bgcolor: 'warning.lighter', borderRadius: 2, border: '1px solid', borderColor: 'warning.light', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <IconMessage2 size={20} color="darkorange" />
                <Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'warning.dark', display: 'block' }}>
                        Đang chờ nhân viên chỉnh sửa
                    </Typography>
                    {latest?.review_comment && (
                        <Typography variant="caption" sx={{ color: 'warning.dark', fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                            "{latest.review_comment}"
                        </Typography>
                    )}
                </Box>
            </Box>
        );
    }

    return (
        <Stack spacing={2} sx={{ p: 1 }}>
            <TextField
                fullWidth multiline rows={3} size="small"
                placeholder="Nhập nội dung nhận xét hoặc yêu cầu chỉnh sửa..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'grey.50' } }}
            />
            <Button
                fullWidth variant="contained" color="error" onClick={handleSubmit}
                disabled={loading || !comment.trim()}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <IconSend size={16} />}
                sx={{ borderRadius: 2, fontWeight: 800 }}
            >
                GỬI PHẢN HỒI RÀ SOÁT
            </Button>
        </Stack>
    );
};
