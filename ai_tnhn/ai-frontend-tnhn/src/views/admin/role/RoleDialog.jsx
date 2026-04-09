import { useEffect, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Grid, Typography, Box, useTheme,
    FormControlLabel, Switch
} from '@mui/material';
import { IconShieldCheck } from '@tabler/icons-react';
import * as ROLES from 'constants/role';

const RoleDialog = ({ open, onClose, onSubmit, role, isEdit }) => {
    const theme = useTheme();
    const [values, setValues] = useState({
        name: '',
        code: '',
        description: '',
        level: 0,
        is_company: false,
        is_employee: false
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (role) {
            setValues({
                name: role.name || '',
                code: role.code || '',
                description: role.description || '',
                level: role.level || 0,
                is_company: role.is_company || false,
                is_employee: role.is_employee || false
            });
        } else {
            setValues({
                name: '',
                code: '',
                description: '',
                level: 0,
                is_company: false,
                is_employee: false
            });
        }
        setErrors({});
    }, [role, open]);

    const handleChange = (e) => {
        const { name, value, checked, type } = e.target;
        let finalValue = type === 'checkbox' ? checked : value;
        if (name === 'level') finalValue = parseInt(value, 10) || 0;
        setValues({ ...values, [name]: finalValue });
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
                            disabled={isEdit && role?.code === ROLES.ROLE_SUPER_ADMIN}
                            error={!!errors.code}
                            helperText={errors.code || 'Mã viết liền, không dấu, dùng để xác định trong code (ví dụ: gd_xn)'}
                            variant="outlined"
                            placeholder={ROLES.ROLE_GIAM_DOC_XN}
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
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Cấp độ (Level)"
                            name="level"
                            type="number"
                            value={values.level}
                            onChange={handleChange}
                            variant="outlined"
                            helperText="0: Super Admin, 1, 2, ... (Số càng thấp quyền càng cao)"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={values.is_company}
                                    onChange={handleChange}
                                    name="is_company"
                                    color="primary"
                                />
                            }
                            label={
                                <Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Vai trò cấp Công ty</Typography>
                                    <Typography variant="caption" color="textSecondary">
                                        Bật nếu vai trò này thuộc văn phòng Tổng công ty (TNHN). Tắt nếu thuộc Xí nghiệp.
                                    </Typography>
                                </Box>
                            }
                            sx={{ 
                                width: '100%', 
                                ml: 0, p: 1.5, 
                                borderRadius: '12px', 
                                border: '1px solid', 
                                borderColor: values.is_company ? 'primary.main' : 'divider',
                                bgcolor: values.is_company ? 'primary.lighter' : 'transparent',
                            }}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={values.is_employee}
                                    onChange={handleChange}
                                    name="is_employee"
                                    color="secondary"
                                />
                            }
                            label={
                                <Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Cấu hình Nhân viên / Công nhân</Typography>
                                    <Typography variant="caption" color="textSecondary">
                                        Bật nếu vai trò này thuộc khối thực thi (Nhân viên, Công nhân). Tắt nếu là vai trò Quản lý.
                                    </Typography>
                                </Box>
                            }
                            sx={{ 
                                width: '100%', 
                                ml: 0, p: 1.5, 
                                borderRadius: '12px', 
                                border: '1px solid', 
                                borderColor: values.is_employee ? 'secondary.main' : 'divider',
                                bgcolor: values.is_employee ? 'secondary.lighter' : 'transparent',
                                transition: 'all 0.3s ease'
                            }}
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
