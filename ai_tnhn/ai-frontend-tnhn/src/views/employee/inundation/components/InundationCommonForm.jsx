import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Button, Typography, Stack, IconButton, CircularProgress, TextField, InputAdornment, Chip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconCloudUpload, IconX, IconSend, IconRuler } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import { processAndWatermark } from 'utils/imageProcessor';
import { getInundationImageUrl } from 'utils/imageHelper';
import settingApi from 'api/setting';
import PermissionGuard from 'ui-component/PermissionGuard';

const InundationCommonForm = ({
    watermarkText = '',
    oldImages = [],
    onSubmit,
    submitText = 'Gửi cập nhật',
    submitColor = 'secondary', // secondary, error, deepPurple, cyan...
    loading = false,
    
    // Ghi chú
    noteValue = '',
    onNoteChange,
    noteLabel = 'Ghi chú',
    notePlaceholder = 'Nhập ghi chú thêm...',
    noteRows = 3,

    // DxRxS (Dài, Rộng, Sâu)
    depth = '',
    onDepthChange,
    depthLabel = 'Sâu',
    width = '',
    onWidthChange,
    widthLabel = 'Rộng',
    length = '',
    onLengthChange,
    lengthLabel = 'Dài',

    permission = '', // Quyền phân quyền cho nút submit nếu cần
    children
}) => {
    const theme = useTheme();
    const [images, setImages] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [floodLevelSettings, setFloodLevelSettings] = useState([]);

    // Tải cấu hình mức độ ngập
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

    // Xác định mức độ ngập dựa trên độ sâu
    const currentLevel = useMemo(() => {
        const d = parseFloat(depth);
        if (isNaN(d)) return null;
        return floodLevelSettings.find(l => d >= l.min_depth && d < l.max_depth);
    }, [depth, floodLevelSettings]);

    // Dọn dẹp object URLs
    useEffect(() => {
        return () => {
            previews.forEach(src => URL.revokeObjectURL(src));
        };
    }, [previews]);

    const handleFileChange = async (e) => {
        const pickedFiles = Array.from(e.target.files);
        if (pickedFiles.length === 0) return;

        const currentCount = images.length + oldImages.length;
        const newCount = pickedFiles.length;
        const totalCount = currentCount + newCount;

        if (totalCount > 10) {
            const errorMsg = `Vượt quá giới hạn 10 ảnh (Hiện có ${currentCount}, bạn chọn thêm ${newCount})`;
            toast.error(errorMsg);
            e.target.value = '';
            return;
        }

        setProcessing(true);
        try {
            const processedFiles = await Promise.all(
                pickedFiles.map(file => processAndWatermark(file, watermarkText))
            );
            setImages(prev => [...prev, ...processedFiles]);
            setPreviews(prev => [...prev, ...processedFiles.map(file => URL.createObjectURL(file))]);
        } catch (error) {
            console.error('Lỗi xử lý ảnh:', error);
            toast.error('Không thể xử lý ảnh, vui lòng thử lại');
            setImages(prev => [...prev, ...pickedFiles]);
            setPreviews(prev => [...prev, ...pickedFiles.map(file => URL.createObjectURL(file))]);
        } finally {
            setProcessing(false);
            e.target.value = '';
        }
    };

    const removeImage = (i) => {
        const ni = [...images];
        ni.splice(i, 1);
        setImages(ni);

        const np = [...previews];
        URL.revokeObjectURL(np[i]);
        np.splice(i, 1);
        setPreviews(np);
    };

    const handleSubmit = () => {
        if (onSubmit) {
            onSubmit(images, () => {
                setImages([]);
                setPreviews([]);
            });
        }
    };

    const handleNumericChange = (e, callback) => {
        let value = e.target.value.replace(/,/g, '.');
        if (value && !/^\d*\.?\d*$/.test(value)) return;
        if (callback) callback(value);
    };

    // Nút submit tuỳ biến màu sắc
    const renderSubmitButton = () => {
        let btnColor = submitColor;
        let customStyles = {};

        if (submitColor === 'deepPurple') {
            btnColor = 'primary';
            customStyles = {
                bgcolor: '#673ab7',
                '&:hover': { bgcolor: '#5e35b1' }
            };
        } else if (submitColor === 'cyan') {
            btnColor = 'primary';
            customStyles = {
                bgcolor: '#00bcd4',
                '&:hover': { bgcolor: '#00acc1' }
            };
        }

        return (
            <Button
                fullWidth
                size="large"
                variant="contained"
                color={btnColor}
                disabled={loading || processing}
                onClick={handleSubmit}
                startIcon={loading ? <CircularProgress size={17} color="inherit" /> : <IconSend size={17} />}
                sx={{
                    borderRadius: 100,
                    py: 1.4,
                    fontWeight: 700,
                    mt: 1,
                    ...customStyles
                }}
            >
                {loading ? 'Đang xử lý...' : submitText}
            </Button>
        );
    };

    return (
        <Stack spacing={2} sx={{
            '& .MuiInputLabel-root': { fontSize: '1rem' },
            '& .MuiInputBase-input': { fontSize: '1rem' },
            '& .MuiFormHelperText-root': { fontSize: '0.875rem' },
        }}>
            {/* Render các input tuỳ biến truyền từ cha (VD: checkbox, dropdown...) */}
            {children}

            {/* Render Dài, Rộng, Sâu (DxRxS) */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                    fullWidth label={lengthLabel} name="length" value={length}
                    onChange={(e) => handleNumericChange(e, onLengthChange)}
                    type="text" placeholder="VD: 50"
                    disabled={loading}
                    slotProps={{
                        htmlInput: { inputMode: 'decimal' },
                        input: {
                            startAdornment: <InputAdornment position="start"><IconRuler size={15} color={theme.palette.text.secondary} /></InputAdornment>
                        }
                    }}
                />
                <TextField
                    fullWidth label={widthLabel} name="width" value={width}
                    onChange={(e) => handleNumericChange(e, onWidthChange)}
                    type="text" placeholder="VD: 3"
                    disabled={loading}
                    slotProps={{
                        htmlInput: { inputMode: 'decimal' },
                        input: {
                            startAdornment: <InputAdornment position="start"><IconRuler size={15} color={theme.palette.text.secondary} /></InputAdornment>
                        }
                    }}
                />
                <TextField
                    fullWidth label={depthLabel} name="depth" value={depth}
                    onChange={(e) => handleNumericChange(e, onDepthChange)}
                    type="text" placeholder="VD: 0.2"
                    disabled={loading}
                    slotProps={{
                        htmlInput: { inputMode: 'decimal' },
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

            {/* Phần upload ảnh */}
            <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1, display: 'block' }}>
                    Ảnh hiện trường
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    <Button
                        component="label"
                        variant="outlined"
                        disabled={processing || loading}
                        sx={{
                            width: 80, height: 80, borderRadius: 2,
                            border: '2px dashed', borderColor: 'divider',
                            display: 'flex', flexDirection: 'column', gap: 0.5,
                            bgcolor: 'grey.50',
                            '&:hover': { bgcolor: 'secondary.lighter', borderColor: 'secondary.main' }
                        }}
                    >
                        {processing ? (
                            <CircularProgress size={20} color="secondary" />
                        ) : (
                            <IconCloudUpload size={24} color={theme.palette.secondary.main} />
                        )}
                        <Typography variant="caption" color="text.secondary">Chọn ảnh</Typography>
                        <input type="file" hidden multiple accept="image/*" onChange={handleFileChange} />
                    </Button>

                    {/* Previews của ảnh mới chọn */}
                    {previews.map((src, i) => (
                        <Box key={`new-${i}`} sx={{ position: 'relative', width: 80, height: 80 }}>
                            <Box
                                component="img"
                                src={src}
                                alt=""
                                sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
                            />
                            <IconButton
                                size="small"
                                onClick={() => removeImage(i)}
                                disabled={loading}
                                sx={{
                                    position: 'absolute', top: -6, right: -6,
                                    bgcolor: 'error.main', color: '#fff', p: 0.3,
                                    '&:hover': { bgcolor: 'error.dark' }
                                }}
                            >
                                <IconX size={11} />
                            </IconButton>
                        </Box>
                    ))}

                    {/* Hiển thị ảnh cũ từ server nếu chưa chọn ảnh mới */}
                    {!images.length && oldImages.map((img, idx) => (
                        <Box key={`old-${idx}`} sx={{ width: 80, height: 80 }}>
                            <Box
                                component="img"
                                src={getInundationImageUrl(img)}
                                alt=""
                                sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 2, border: '1px solid', borderColor: 'divider', opacity: 0.8 }}
                            />
                        </Box>
                    ))}
                </Stack>
            </Box>

            {/* Ô nhập ghi chú / mô tả */}
            {noteLabel && (
                <TextField
                    fullWidth
                    multiline
                    rows={noteRows}
                    label={noteLabel}
                    placeholder={notePlaceholder}
                    value={noteValue}
                    onChange={onNoteChange}
                    disabled={loading}
                    sx={{ '& .MuiInputLabel-root': { fontWeight: 800 } }}
                />
            )}

            {/* Nút Submit có phân quyền hoặc không */}
            {permission ? (
                <PermissionGuard
                    permission={permission}
                    fallback={
                        <Button fullWidth size="large" variant="contained" disabled sx={{ borderRadius: 100, py: 1.4, fontWeight: 700, mt: 1 }}>
                            Không có quyền thực hiện
                        </Button>
                    }
                >
                    {renderSubmitButton()}
                </PermissionGuard>
            ) : (
                renderSubmitButton()
            )}
        </Stack>
    );
};

export default InundationCommonForm;
