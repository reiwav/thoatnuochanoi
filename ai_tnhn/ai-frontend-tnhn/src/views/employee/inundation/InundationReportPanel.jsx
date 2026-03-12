import { useState, useEffect } from 'react';
import {
    Box, Button, TextField, Typography,
    Stack, IconButton, CircularProgress,
    InputAdornment, FormControlLabel, Checkbox,
    MenuItem
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    IconCloudUpload, IconX, IconSend,
    IconMapPin, IconRuler, IconClock, IconFileText, IconCar
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
        traffic_status: 'Đi lại bình thường',
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
                traffic_status: selectedReport.traffic_status || selectedReport.trafficStatus || 'Đi lại bình thường',
                start_time: selectedReport.start_time ? new Date(selectedReport.start_time * 1000).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)
            });
        }
    }, [selectedReport]);

    const handleChange = (e) => setValues({ ...values, [e.target.name]: e.target.value });

    const handleImageChange = async (e) => {
        const pickedFiles = Array.from(e.target.files);
        console.log('Files picked:', pickedFiles.length, 'Existing:', images.length);
        if (pickedFiles.length === 0) return;

        const currentCount = images.length;
        const newCount = pickedFiles.length;
        const totalCount = currentCount + newCount;

        if (totalCount > 10) {
            const errorMsg = `Vượt quá giới hạn 10 ảnh (Hiện có ${currentCount}, bạn chọn thêm ${newCount})`;
            console.error(errorMsg);
            toast.error(errorMsg);
            e.target.value = '';
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
                            const resizedFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
                            resolve(resizedFile);
                        } else {
                            reject(new Error('Canvas to Blob failed'));
                        }
                    }, 'image/jpeg', 0.8);
                };
                img.onerror = reject;
                img.src = URL.createObjectURL(file);
            });
        };

        try {
            const resizedFiles = await Promise.all(pickedFiles.map(resizeImage));
            setImages(prev => [...prev, ...resizedFiles]);
            setPreviews(prev => [...prev, ...resizedFiles.map(file => URL.createObjectURL(file))]);
        } catch (error) {
            console.error('Error resizing images:', error);
            toast.error('Lỗi khi xử lý ảnh, vui lòng thử lại');
            setImages(prev => [...prev, ...pickedFiles]);
            setPreviews(prev => [...prev, ...pickedFiles.map(file => URL.createObjectURL(file))]);
        } finally {
            e.target.value = '';
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
            if (values.traffic_status) fd.append('traffic_status', values.traffic_status);
            if (resolveOnUpdate) fd.append('resolve', 'true');
            images.forEach(img => fd.append('images', img));
            const res = await inundationApi.updateSituation(selectedReport.id, fd);
            if (res.data?.status === 'success') {
                toast.success(resolveOnUpdate ? 'Đã kết thúc đợt ngập' : 'Cập nhật thành công');
                setValues(v => ({ ...v, description: '', traffic_status: 'Đi lại bình thường' }));
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
            if (values.traffic_status) fd.append('traffic_status', values.traffic_status);
            if (pointId) fd.append('point_id', pointId);
            fd.append('start_time', Math.floor(Date.now() / 1000));
            images.forEach(img => fd.append('images', img));
            const res = await inundationApi.createReport(fd);
            if (res.data?.status === 'success') {
                toast.success('Gửi báo cáo thành công');
                setValues({ ...values, length: '', width: '', depth: '', description: '', traffic_status: 'Đi lại bình thường', start_time: new Date().toISOString().slice(0, 16) });
                setImages([]); setPreviews([]);
                if (onSuccess) onSuccess();
            }
        } catch (err) { toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra'); }
        finally { setLoading(false); }
    };

    return (
        <Stack spacing={2} sx={{
            '& .MuiInputLabel-root': { fontSize: '1rem' },
            '& .MuiInputBase-input': { fontSize: '1rem' },
            '& .MuiFormHelperText-root': { fontSize: '0.875rem' },
        }}>
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
                    label={<Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'error.main' }}>Đã hết ngập (Kết thúc đợt này)</Typography>}
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
                select
                fullWidth label="Tình trạng giao thông" name="traffic_status"
                value={values.traffic_status} onChange={handleChange}
                InputProps={{
                    startAdornment: <InputAdornment position="start"><IconCar size={17} color={theme.palette.text.secondary} /></InputAdornment>
                }}
            >
                <MenuItem value="Đi lại bình thường">Đi lại bình thường</MenuItem>
                <MenuItem value="Đi lại khó khăn">Đi lại khó khăn</MenuItem>
                <MenuItem value="Không đi lại được">Không đi lại được</MenuItem>
            </TextField>

            <TextField
                fullWidth label="Mô tả chi tiết" name="description" multiline rows={3}
                value={values.description} onChange={handleChange}
                placeholder="Nước dâng cao, xe máy không qua được..."
                InputProps={{ startAdornment: <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}><IconFileText size={17} color={theme.palette.text.secondary} /></InputAdornment> }}
            />

            <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1, display: 'block' }}>Ảnh hiện trường</Typography>
                <Box>
                    <Box component="label" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, border: '2px dashed', borderColor: 'divider', borderRadius: 2, p: 2, cursor: 'pointer', bgcolor: 'grey.50', transition: 'all .2s', '&:hover': { borderColor: 'secondary.main', bgcolor: 'secondary.lighter' } }}>
                        <input type="file" hidden multiple accept="image/*" onChange={handleImageChange} />
                        <IconCloudUpload size={26} color={theme.palette.secondary.main} />
                        <Typography variant="body2" color="text.secondary">Chọn ảnh</Typography>
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
