import React from 'react';
import {
    TextField, Box, FormControl, InputLabel, Select, MenuItem, CircularProgress, FormControlLabel, Switch
} from '@mui/material';

const EmployeeBasicInfoFields = ({
    formData,
    handleChange,
    roles = [],
    fetchingData,
    canSelectOrg,
    organizations = [],
    isEdit
}) => {
    return (
        <>
            <TextField
                fullWidth label="Họ và tên" required size="small"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                slotProps={{ input: { sx: { borderRadius: 3, fontWeight: 600 } } }}
            />

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <TextField
                    fullWidth label="Email" required size="small"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    sx={{ flex: 1 }}
                    slotProps={{ input: { sx: { borderRadius: 3, fontWeight: 600 } } }}
                />
                <FormControl fullWidth size="small" sx={{ flex: 1 }}>
                    <InputLabel>Vai trò</InputLabel>
                    <Select
                        value={formData.role}
                        label="Vai trò"
                        onChange={(e) => handleChange('role', e.target.value)}
                        sx={{ borderRadius: 3, fontWeight: 600 }}
                    >
                        {fetchingData && roles.length === 0 ? (
                            <MenuItem value={formData.role}>
                                <CircularProgress size={14} sx={{ mr: 1 }} /> Đang tải...
                            </MenuItem>
                        ) : (
                            roles.map((r) => (
                                <MenuItem key={r.code} value={r.code}>
                                    {r.name}
                                </MenuItem>
                            ))
                        )}
                    </Select>
                </FormControl>
            </Box>

            {/* Org selector dropdown - Only for privileged roles */}
            {canSelectOrg && (
                <FormControl fullWidth size="small">
                    <InputLabel>Công ty / Xí nghiệp *</InputLabel>
                    <Select
                        value={formData.org_id}
                        label="Công ty / Xí nghiệp *"
                        onChange={(e) => handleChange('org_id', e.target.value)}
                        sx={{ borderRadius: 3, fontWeight: 600 }}
                    >
                        {organizations.map((org) => (
                            <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            )}

            <TextField
                fullWidth label="Mật khẩu" required={!isEdit} size="small"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder={isEdit ? 'Để trống nếu không đổi' : ''}
                slotProps={{ input: { sx: { borderRadius: 3, fontWeight: 600 } } }}
            />

            <FormControlLabel
                control={
                    <Switch
                        checked={formData.active}
                        onChange={(e) => handleChange('active', e.target.checked)}
                        color="primary"
                    />
                }
                label="Kích hoạt tài khoản"
            />
        </>
    );
};

export default EmployeeBasicInfoFields;
