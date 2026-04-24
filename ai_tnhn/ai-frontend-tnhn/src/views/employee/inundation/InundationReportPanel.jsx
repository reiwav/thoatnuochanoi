import { useState, useEffect, useMemo } from 'react';
import {
    Box, Button, TextField, Typography,
    Stack, IconButton, CircularProgress,
    InputAdornment, FormControlLabel, Checkbox,
    MenuItem, Chip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    IconCloudUpload, IconX, IconSend,
    IconMapPin, IconRuler, IconClock
} from '@tabler/icons-react';
import { toast } from 'react-hot-toast';

import inundationApi from 'api/inundation';
import settingApi from 'api/setting';
import { processAndWatermark } from 'utils/imageProcessor';
import useAuthStore from 'store/useAuthStore';
import PermissionGuard from 'ui-component/PermissionGuard';

const InundationReportPanel = ({ selectedReport, pointId, initialStreetName, onSuccess, isCorrectionMode = false }) => {
    const theme = useTheme();
    const { hasPermission } = useAuthStore();
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
    const [points, setPoints] = useState([]);
    const [fetchingPoints, setFetchingPoints] = useState(false);
    const [floodLevelSettings, setFloodLevelSettings] = useState([]);

    useEffect(() => {
        const fetchLevels = async () => {
            try {
                const res = await settingApi.getFloodLevels();
                setFloodLevelSettings(res || []);
            } catch (err) {
                console.error('Lỗi tải cấu hình mức độ ngập:', err);
            }
        };
        fetchLevels();
    }, []);

    const currentLevel = useMemo(() => {
        const d = parseFloat(values.depth);
        if (isNaN(d)) return null;
        return floodLevelSettings.find(l => d >= l.min_depth && d < l.max_depth);
    }, [values.depth, floodLevelSettings]);

    useEffect(() => {
        if (!pointId && !selectedReport) {
            fetchPoints();
        }
    }, [pointId, selectedReport]);

    const fetchPoints = async () => {
        setFetchingPoints(true);
        try {
            const res = await inundationApi.getPointsStatus({ per_page: 1000 });
            setPoints(res || []);
        } catch (err) {
            console.error('Lỗi tải danh sách điểm ngập:', err);
        } finally {
            setFetchingPoints(false);
        }
    };

    useEffect(() => {
        if (selectedReport) {
            setValues({
                street_name: selectedReport.street_name || '',
                length: selectedReport.length || '',
                width: selectedReport.width || '',
                depth: selectedReport.depth || '',
                description: selectedReport.description || '',
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

        try {
            const watermarkText = values.street_name || (points.find(p => p.id === values.point_id)?.street_name) || '';
            const processedFiles = await Promise.all(pickedFiles.map(file => processAndWatermark(file, watermarkText)));
            setImages(prev => [...prev, ...processedFiles]);
            setPreviews(prev => [...prev, ...processedFiles.map(file => URL.createObjectURL(file))]);
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
            if (values.depth) fd.append('depth', parseFloat(values.depth) || 0);
            if (values.traffic_status) fd.append('traffic_status', values.traffic_status);

            if (resolveOnUpdate) fd.append('resolve', 'true');
            if (currentLevel) {
                fd.append('flood_level_name', currentLevel.name);
                fd.append('flood_level_color', currentLevel.color);
            }
            images.forEach(img => fd.append('images', img));

            if (isCorrectionMode) {
                if (selectedReport.type === 'start' && !selectedReport.is_update_record) {
                    // Editing the MAIN report record (used when no updates exist yet)
                    await inundationApi.updateReport(selectedReport.id, fd);
                    toast.success('Đã lưu thay đổi báo cáo chính');
                } else {
                    // Editing an EXISTING UPDATE record (including the start update if it exists)
                    await inundationApi.updateUpdateContent(selectedReport.id, fd);
                    toast.success('Đã lưu thay đổi chỉnh sửa');
                }
            } else {
                // Normal update (adding a new record to the history)
                await inundationApi.updateSituation(selectedReport.id, fd);
                toast.success(resolveOnUpdate ? 'Đã kết thúc đợt ngập' : 'Cập nhật thành công');
            }

            setValues(v => ({ ...v, description: '', traffic_status: 'Đi lại bình thường' }));
            setImages([]); setPreviews([]); setResolveOnUpdate(false);
            if (onSuccess) onSuccess();
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
            if (values.depth) fd.append('depth', parseFloat(values.depth) || 0);
            fd.append('description', values.description);
            if (values.traffic_status) fd.append('traffic_status', values.traffic_status);
            const pId = pointId || values.point_id;
            if (pId) fd.append('point_id', pId);
            fd.append('start_time', Math.floor(Date.now() / 1000));
            if (currentLevel) {
                fd.append('flood_level_name', currentLevel.name);
                fd.append('flood_level_color', currentLevel.color);
            }
            images.forEach(img => fd.append('images', img));
            await inundationApi.createReport(fd);
            toast.success('Gửi báo cáo thành công');
            setValues({ ...values, length: '', width: '', depth: '', description: '', traffic_status: 'Đi lại bình thường', start_time: new Date().toISOString().slice(0, 16) });
            setImages([]); setPreviews([]);
            if (onSuccess) onSuccess();
        } catch (err) { toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra'); }
        finally { setLoading(false); }
    };

    return (
        <Stack spacing={2} sx={{
            '& .MuiInputLabel-root': { fontSize: '1rem' },
            '& .MuiInputBase-input': { fontSize: '1rem' },
            '& .MuiFormHelperText-root': { fontSize: '0.875rem' },
        }}>
            {!pointId && !selectedReport && (
                points.length > 0 ? (
                    <TextField
                        select
                        fullWidth label="Chọn điểm ngập" name="point_id"
                        value={values.point_id || ''}
                        onChange={(e) => {
                            const p = points.find(p => p.id === e.target.value);
                            setValues(prev => ({
                                ...prev,
                                point_id: e.target.value,
                                street_name: p ? p.street_name : ''
                            }));
                        }}
                        required
                        slotProps={{
                            input: {
                                startAdornment: <InputAdornment position="start"><IconMapPin size={17} color={theme.palette.text.secondary} /></InputAdornment>
                            }
                        }}
                    >
                        {points.map((p) => (
                            <MenuItem key={p.id} value={p.id}>{p.street_name}</MenuItem>
                        ))}
                    </TextField>
                ) : (
                    <TextField
                        fullWidth label="Tên tuyến đường / Vị trí" name="street_name"
                        value={values.street_name} onChange={handleChange} required
                        slotProps={{
                            input: {
                                startAdornment: <InputAdornment position="start"><IconMapPin size={17} color={theme.palette.text.secondary} /></InputAdornment>
                            }
                        }}
                    />
                )
            )}

            {selectedReport && (
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={resolveOnUpdate}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                setResolveOnUpdate(checked);
                                if (checked) {
                                    setValues(prev => ({
                                        ...prev,
                                        length: '0',
                                        width: '0',
                                        depth: '0',
                                        traffic_status: 'Đi lại bình thường'
                                    }));
                                }
                            }}
                            color="error"
                        />
                    }
                    label={<Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'error.main' }}>Đã hết ngập (Kết thúc đợt này)</Typography>}
                    sx={{ mt: -1, mb: 1 }}
                />
            )}

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                    fullWidth label="Dài" name="length" value={values.length} onChange={handleChange}
                    type="text" placeholder="VD: 50"
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><IconRuler size={15} color={theme.palette.text.secondary} /></InputAdornment> } }}
                />
                <TextField
                    fullWidth label="Rộng" name="width" value={values.width} onChange={handleChange}
                    type="text" placeholder="VD: 3"
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><IconRuler size={15} color={theme.palette.text.secondary} /></InputAdornment> } }}
                />
                <TextField
                    fullWidth label="Sâu" name="depth" value={values.depth} onChange={handleChange}
                    type="number" placeholder="VD: 20"
                    slotProps={{
                        htmlInput: { inputMode: 'decimal', step: 'any' },
                        input: {
                            startAdornment: <InputAdornment position="start"><IconRuler size={15} color={theme.palette.text.secondary} /></InputAdornment>,
                            endAdornment: currentLevel && (
                                <InputAdornment position="end">
                                    <Chip
                                        label={currentLevel.name}
                                        size="small"
                                        sx={{
                                            bgcolor: currentLevel.color,
                                            color: '#fff',
                                            fontWeight: 800,
                                            fontSize: '0.75rem',
                                            height: 24
                                        }}
                                    />
                                </InputAdornment>
                            )
                        }
                    }}
                    helperText={currentLevel ? `Mức độ xác định: ${currentLevel.name}` : 'Nhập độ sâu để tự động xác định mức độ'}
                />
            </Stack>

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

            <PermissionGuard
                permission="inundation:report"
                fallback={
                    <Button fullWidth size="large" variant="contained" disabled sx={{ borderRadius: 100, py: 1.4, fontWeight: 700, mt: 1 }}>
                        Không có quyền thực hiện
                    </Button>
                }
            >
                <Button
                    fullWidth size="large" variant="contained"
                    color={isCorrectionMode ? 'error' : (resolveOnUpdate ? 'error' : 'secondary')}
                    onClick={handleSubmit}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={17} color="inherit" /> : <IconSend size={17} />}
                    sx={{ borderRadius: 100, py: 1.4, fontWeight: 700, mt: 1 }}
                >
                    {loading ? 'Đang xử lý...' : (
                        isCorrectionMode
                            ? 'Lưu thay đổi chỉnh sửa'
                            : (resolveOnUpdate ? 'Xác nhận Kết thúc đợt ngập' : (selectedReport ? 'Cập nhật tình hình' : 'Gửi báo cáo'))
                    )}
                </Button>
            </PermissionGuard>
        </Stack>
    );
};

export default InundationReportPanel;
