import { useEffect, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Grid, Typography, Box, useTheme,
    InputAdornment, FormControlLabel, Switch
} from '@mui/material';
import { IconClipboardCheck } from '@tabler/icons-react';

const FloodLevelDialog = ({ open, onClose, onSubmit, level, isEdit }) => {
    const theme = useTheme();
    const [values, setValues] = useState({
        code: '',
        name: '',
        min_depth: 0,
        max_depth: 0,
        color: '#000000',
        description: '',
        is_flooding: false
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (level) {
            setValues({
                code: level.code || '',
                name: level.name || '',
                min_depth: level.min_depth || 0,
                max_depth: level.max_depth || 0,
                color: level.color || '#000000',
                description: level.description || '',
                is_flooding: level.is_flooding || false
            });
        } else {
            setValues({
                code: '',
                name: '',
                min_depth: 0,
                max_depth: 0,
                color: '#2196f3',
                description: '',
                is_flooding: false
            });
        }
        setErrors({});
    }, [level, open]);

    const handleChange = (e) => {
        const { name, value, checked, type } = e.target;
        let finalValue = type === 'checkbox' ? checked : value;
        if (name === 'min_depth' || name === 'max_depth') {
            finalValue = parseFloat(value) || 0;
        }
        setValues({ ...values, [name]: finalValue });
        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!values.code) newErrors.code = 'Vui lòng nhập mã mức độ';
        if (!values.name) newErrors.name = 'Vui lòng nhập tên mức độ';
        if (values.max_depth < values.min_depth) {
            newErrors.max_depth = 'Sâu tối đa không được nhỏ hơn tối thiểu';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleFormSubmit = () => {
        if (validate()) {
            onSubmit(values);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            slotProps={{
                paper: {
                    sx: { borderRadius: '16px', p: 1 }
                }
            }}
        >
            <DialogTitle sx={{ pb: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Box sx={{ p: 1, borderRadius: 2, bgcolor: theme.palette.primary.lighter, display: 'flex' }}>
                        <IconClipboardCheck size={24} color={theme.palette.primary.main} />
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                        {isEdit ? 'Chỉnh sửa mức độ' : 'Thêm mới mức độ'}
                    </Typography>
                </Box>
            </DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                    Cấu hình ngưỡng độ sâu ngập và màu sắc hiển thị tương ứng trên bản đồ.
                </Typography>
                <Grid container spacing={2.5}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Mã (Code)"
                            name="code"
                            value={values.code}
                            onChange={handleChange}
                            error={!!errors.code}
                            helperText={errors.code}
                            variant="outlined"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Tên mức độ"
                            name="name"
                            value={values.name}
                            onChange={handleChange}
                            error={!!errors.name}
                            helperText={errors.name}
                            variant="outlined"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Sâu tối thiểu"
                            name="min_depth"
                            type="number"
                            value={values.min_depth}
                            onChange={handleChange}
                            variant="outlined"
                            slotProps={{
                                input: {
                                    endAdornment: <InputAdornment position="end">m</InputAdornment>,
                                }
                            }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Sâu tối đa"
                            name="max_depth"
                            type="number"
                            value={values.max_depth}
                            onChange={handleChange}
                            error={!!errors.max_depth}
                            helperText={errors.max_depth}
                            variant="outlined"
                            slotProps={{
                                input: {
                                    endAdornment: <InputAdornment position="end">m</InputAdornment>,
                                }
                            }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Màu sắc hiển thị"
                            name="color"
                            type="color"
                            value={values.color}
                            onChange={handleChange}
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': { borderRadius: '12px' },
                                '& input': { height: 40, p: 0.5, cursor: 'pointer' }
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={values.is_flooding}
                                    onChange={handleChange}
                                    name="is_flooding"
                                    color="error"
                                />
                            }
                            label={
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                    Coi là trạng thái ngập
                                </Typography>
                            }
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Mô tả"
                            name="description"
                            value={values.description}
                            onChange={handleChange}
                            multiline
                            rows={3}
                            variant="outlined"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 0 }}>
                <Button
                    onClick={onClose}
                    variant="text"
                    sx={{ borderRadius: '10px', color: 'text.secondary' }}
                >
                    Hủy bỏ
                </Button>
                <Button
                    onClick={handleFormSubmit}
                    variant="contained"
                    color="primary"
                    sx={{ borderRadius: '10px', px: 4, fontWeight: 700 }}
                >
                    {isEdit ? 'Cập nhật' : 'Thêm mới'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default FloodLevelDialog;
