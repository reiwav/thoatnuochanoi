import { useState, useEffect } from 'react';
import {
    Box, Button, TextField, Typography,
    Stack, IconButton, CircularProgress,
    InputAdornment, FormControlLabel, Checkbox
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    IconCloudUpload, IconX, IconSend,
    IconMapPin, IconRuler, IconClock, IconFileText
} from '@tabler/icons-react';
import { toast } from 'react-hot-toast';

import inundationApi from 'api/inundation';

const InundationReportPanel = ({ selectedReport, pointId, initialStreetName, onSuccess }) => {
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const [values, setValues] = useState({
        street_name: initialStreetName || '',
        length: '',
        width: '',
        depth: '',
        description: '',
        start_time: new Date().toISOString().slice(0, 16)
    });
    const [images, setImages] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [resolveOnUpdate, setResolveOnUpdate] = useState(false);

    useEffect(() => {
        if (selectedReport) {
            setValues({
                street_name: selectedReport.street_name || '',
                length: selectedReport.length || '',
                width: selectedReport.width || '',
                depth: selectedReport.depth || '',
                description: '',
                start_time: selectedReport.start_time ? new Date(selectedReport.start_time * 1000).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)
            });
        }
    }, [selectedReport]);

    const handleChange = (e) => setValues({ ...values, [e.target.name]: e.target.value });

    const handleImageChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 5) {
            toast.error('Chỉ được tải lên tối đa 5 ảnh');
            return;
        }

        const resizeImage = (file) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_WIDTH = 1024;

                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        if (blob) {
                            // Create a new File object from the Blob to retain the original name if possible
                            const resizedFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
                            resolve(resizedFile);
                        } else {
                            reject(new Error('Canvas to Blob failed'));
                        }
                    }, 'image/jpeg', 0.8); // 80% quality JPEG
                };
                img.onerror = reject;
                img.src = URL.createObjectURL(file);
            });
        };

        try {
            const resizedFiles = await Promise.all(files.map(resizeImage));
            setImages(resizedFiles);
            setPreviews(resizedFiles.map(file => URL.createObjectURL(file)));
        } catch (error) {
            console.error('Error resizing images:', error);
            toast.error('Lỗi khi xử lý ảnh, vui lòng thử lại');
            // Fallback to original files if resize somehow fails
            setImages(files);
            setPreviews(files.map(file => URL.createObjectURL(file)));
        }
    };
    const removeImage = (i) => {
        const ni = [...images]; ni.splice(i, 1); setImages(ni);
        const np = [...previews]; URL.revokeObjectURL(np[i]); np.splice(i, 1); setPreviews(np);
    };

    const handleUpdate = async () => {
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append('description', values.description);
            if (values.length) fd.append('length', values.length);
            if (values.width) fd.append('width', values.width);
            if (values.depth) fd.append('depth', values.depth);
            if (resolveOnUpdate) fd.append('resolve', 'true');
            images.forEach(img => fd.append('images', img));
            const res = await inundationApi.updateSituation(selectedReport.id, fd);
            if (res.data?.status === 'success') {
                toast.success(resolveOnUpdate ? 'Đã kết thúc đợt ngập' : 'Cập nhật thành công');
                setValues(v => ({ ...v, description: '' }));
                setImages([]); setPreviews([]); setResolveOnUpdate(false);
                if (onSuccess) onSuccess();
            }
        } catch (err) { toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra'); }
        finally { setLoading(false); }
    };

    const handleSubmit = async () => {
        if (selectedReport) return handleUpdate();
        if (!values.street_name) { toast.error('Vui lòng nhập tên tuyến đường'); return; }
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append('street_name', values.street_name);
            if (values.length) fd.append('length', values.length);
            if (values.width) fd.append('width', values.width);
            if (values.depth) fd.append('depth', values.depth);
            fd.append('description', values.description);
            if (pointId) fd.append('point_id', pointId);
            fd.append('start_time', Math.floor(new Date(values.start_time).getTime() / 1000));
            images.forEach(img => fd.append('images', img));
            const res = await inundationApi.createReport(fd);
            if (res.data?.status === 'success') {
                toast.success('Gửi báo cáo thành công');
                setValues({ ...values, length: '', width: '', depth: '', description: '', start_time: new Date().toISOString().slice(0, 16) });
                setImages([]); setPreviews([]);
                if (onSuccess) onSuccess();
            }
        } catch (err) { toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra'); }
        finally { setLoading(false); }
    };

    return (
        <Stack spacing={2}>
            <TextField
                fullWidth label="Tên tuyến đường / Vị trí" name="street_name"
                value={values.street_name} onChange={handleChange} required
                disabled={!!pointId || !!selectedReport}
                helperText={!!pointId || !!selectedReport ? '📍 Vị trí từ hệ thống' : ''}
                InputProps={{
                    startAdornment: <InputAdornment position="start"><IconMapPin size={17} color={theme.palette.text.secondary} /></InputAdornment>
                }}
            />

            {selectedReport && (
                <FormControlLabel
                    control={<Checkbox checked={resolveOnUpdate} onChange={(e) => setResolveOnUpdate(e.target.checked)} color="error" />}
                    label={<Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'error.main' }}>Đã hết ngập (Kết thúc đợt này)</Typography>}
                    sx={{ mt: -1, mb: 1 }}
                />
            )}

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                    fullWidth label="Dài" name="length" value={values.length} onChange={handleChange}
                    type="text" placeholder="VD: 50"
                    InputProps={{ startAdornment: <InputAdornment position="start"><IconRuler size={15} color={theme.palette.text.secondary} /></InputAdornment> }}
                />
                <TextField
                    fullWidth label="Rộng" name="width" value={values.width} onChange={handleChange}
                    type="text" placeholder="VD: 3"
                    InputProps={{ startAdornment: <InputAdornment position="start"><IconRuler size={15} color={theme.palette.text.secondary} /></InputAdornment> }}
                />
                <TextField
                    fullWidth label="Sâu" name="depth" value={values.depth} onChange={handleChange}
                    type="text" placeholder="VD: 20"
                    InputProps={{ startAdornment: <InputAdornment position="start"><IconRuler size={15} color={theme.palette.text.secondary} /></InputAdornment> }}
                />
            </Stack>

            <TextField
                fullWidth label="Thời gian" name="start_time" type="datetime-local"
                value={values.start_time} onChange={handleChange} InputLabelProps={{ shrink: true }}
                InputProps={{ startAdornment: <InputAdornment position="start"><IconClock size={17} color={theme.palette.text.secondary} /></InputAdornment> }}
            />

            <TextField
                fullWidth label="Mô tả chi tiết" name="description" multiline rows={3}
                value={values.description} onChange={handleChange}
                placeholder="Nước dâng cao, xe máy không qua được..."
                InputProps={{ startAdornment: <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}><IconFileText size={17} color={theme.palette.text.secondary} /></InputAdornment> }}
            />

            <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1, display: 'block' }}>Ảnh hiện trường</Typography>
                <Box>
                    <Box component="label" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, border: '2px dashed', borderColor: 'divider', borderRadius: 2, p: 2, cursor: 'pointer', bgcolor: 'grey.50', transition: 'all .2s', '&:hover': { borderColor: 'secondary.main', bgcolor: 'secondary.lighter' } }}>
                        <input type="file" hidden multiple accept="image/*" onChange={handleImageChange} />
                        <IconCloudUpload size={22} color={theme.palette.secondary.main} />
                        <Typography variant="caption" color="text.secondary">Chọn ảnh</Typography>
                    </Box>
                    {previews.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
                            {previews.map((src, i) => (
                                <Box key={i} sx={{ position: 'relative', width: 68, height: 68 }}>
                                    <Box component="img" src={src} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }} />
                                    <IconButton size="small" onClick={() => removeImage(i)} sx={{ position: 'absolute', top: -6, right: -6, bgcolor: 'error.main', color: '#fff', p: 0.3, '&:hover': { bgcolor: 'error.dark' } }}>
                                        <IconX size={11} />
                                    </IconButton>
                                </Box>
                            ))}
                        </Box>
                    )}
                </Box>
            </Box>

            <Button
                fullWidth size="large" variant="contained" color="secondary"
                onClick={handleSubmit} disabled={loading}
                startIcon={loading ? <CircularProgress size={17} color="inherit" /> : <IconSend size={17} />}
                sx={{ borderRadius: 100, py: 1.4, fontWeight: 700, mt: 1 }}
            >
                {loading ? 'Đang xử lý...' : (selectedReport ? 'Cập nhật tình hình' : 'Gửi báo cáo')}
            </Button>
        </Stack>
    );
};

export default InundationReportPanel;
