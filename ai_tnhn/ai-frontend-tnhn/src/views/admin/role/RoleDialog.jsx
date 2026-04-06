import { useEffect, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Grid, Typography, Box, useTheme
} from '@mui/material';
import { IconShieldCheck } from '@tabler/icons-react';

const RoleDialog = ({ open, onClose, onSubmit, role, isEdit }) => {
    const theme = useTheme();
    const [values, setValues] = useState({
        name: '',
        code: '',
        description: ''
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (role) {
            setValues({
                name: role.name || '',
                code: role.code || '',
                description: role.description || ''
            });
        } else {
            setValues({
                name: '',
                code: '',
                description: ''
            });
        }
        setErrors({});
    }, [role, open]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setValues({ ...values, [name]: value });
        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!values.name) newErrors.name = 'Vui lòng nhập tên vai trò';
        if (!values.code) newErrors.code = 'Vui lòng nhập mã vai trò';
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
            PaperProps={{
                sx: { borderRadius: '16px', p: 1 }
            }}
        >
            <DialogTitle sx={{ pb: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Box sx={{ p: 1, borderRadius: 2, bgcolor: theme.palette.primary.lighter, display: 'flex' }}>
                        <IconShieldCheck size={24} color={theme.palette.primary.main} />
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                        {isEdit ? 'Chỉnh sửa Vai trò' : 'Thêm mới Vai trò'}
                    </Typography>
                </Box>
            </DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                    Định nghĩa các vai trò trong hệ thống để gán cho người dùng và thiết lập ma trận bảng phân quyền chi tiết.
                </Typography>
                <Grid container spacing={2.5}>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Tên Vai trò"
                            name="name"
                            value={values.name}
                            onChange={handleChange}
                            error={!!errors.name}
                            helperText={errors.name}
                            variant="outlined"
                            placeholder="Ví dụ: Giám đốc Xí nghiệp, Trưởng phòng..."
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Mã (Code) - Duy nhất"
                            name="code"
                            value={values.code}
                            onChange={handleChange}
                            disabled={isEdit && role?.code === 'super_admin'}
                            error={!!errors.code}
                            helperText={errors.code || 'Mã viết liền, không dấu, dùng để xác định trong code (ví dụ: gd_xn)'}
                            variant="outlined"
                            placeholder="giam_doc_xn"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
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
                    sx={{ borderRadius: '10px', px: 4, fontWeight: 700, boxShadow: theme.customShadows?.primary }}
                >
                    {isEdit ? 'Cập nhật' : 'Thêm mới'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default RoleDialog;
