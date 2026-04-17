import React from 'react';
import {
    Grid, TextField, MenuItem, FormControlLabel, Switch, Typography, Stack
} from '@mui/material';
import MultiSelectCheckboxes from 'ui-component/MultiSelectCheckboxes';

const StationBaseFields = ({ formData, handleChange, organizations }) => {
    return (
        <Stack spacing={2.5}>
            <TextField
                fullWidth label="Tên trạm / Điểm" required
                value={formData.TenTram}
                onChange={(e) => handleChange('TenTram', e.target.value)}
            />

            <TextField
                fullWidth label="Địa chỉ"
                value={formData.DiaChi}
                onChange={(e) => handleChange('DiaChi', e.target.value)}
            />

            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth label="Vĩ độ (Lat)"
                        value={formData.Lat}
                        onChange={(e) => handleChange('Lat', e.target.value)}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth label="Kinh độ (Lng)"
                        value={formData.Lng}
                        onChange={(e) => handleChange('Lng', e.target.value)}
                    />
                </Grid>
            </Grid>

            <TextField
                select
                fullWidth
                label="Đơn vị quản lý"
                required
                value={formData.org_id}
                onChange={(e) => handleChange('org_id', e.target.value)}
            >
                <MenuItem value="">Chọn đơn vị quản lý</MenuItem>
                {(organizations.primary || []).map((org) => (
                    <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>
                ))}
            </TextField>

            <FormControlLabel
                control={
                    <Switch
                        checked={formData.share_all}
                        onChange={(e) => handleChange('share_all', e.target.checked)}
                        color="secondary"
                    />
                }
                label={<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Chia sẻ với tất cả xí nghiệp</Typography>}
            />

            {!formData.share_all && (
                <MultiSelectCheckboxes
                    label="Xí nghiệp phối hợp"
                    placeholder="Chọn xí nghiệp"
                    options={(organizations.shared || []).filter((org) => org.id !== formData.org_id)}
                    value={formData.shared_org_ids}
                    onChange={(ids) => handleChange('shared_org_ids', ids)}
                    sx={{
                        '& .MuiAutocomplete-tag': {
                            m: 0.5
                        }
                    }}
                />
            )}

            <FormControlLabel
                control={
                    <Switch
                        checked={formData.Active}
                        onChange={(e) => handleChange('Active', e.target.checked)}
                        color="primary"
                    />
                }
                label={<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Trạng thái hoạt động</Typography>}
            />
        </Stack>
    );
};

export default StationBaseFields;
