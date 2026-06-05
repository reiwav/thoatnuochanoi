import React from 'react';
import {
    Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField,
    FormControlLabel, Checkbox, Stack, MenuItem, Grid, useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MultiSelectCheckboxes from 'ui-component/MultiSelectCheckboxes';
import useSluiceGateDialog from './hooks/useSluiceGateDialog';

const SluiceGateDialog = ({ open, handleClose, item, refresh, organizations = { primary: [], shared: [] } }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    
    const {
        formData,
        handleChange,
        handleSubmit
    } = useSluiceGateDialog({ open, item, handleClose, refresh });

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="sm"
            fullScreen={isMobile}
            slotProps={{ paper: { sx: { borderRadius: isMobile ? 0 : 3 } } }}
        >
            <DialogTitle sx={{ fontWeight: 800, p: { xs: 2, sm: 3 }, bgcolor: 'grey.50' }}>
                {item ? 'Chỉnh sửa cửa phai' : 'Thêm cửa phai mới'}
            </DialogTitle>
            <DialogContent dividers sx={{ p: { xs: 2.5, sm: 3 } }}>
                <Stack spacing={2.5} sx={{ mt: 0.5 }}>
                    <TextField
                        fullWidth label="Tên cửa phai" required
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                    />
                    <TextField
                        fullWidth label="Địa chỉ"
                        value={formData.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                    />
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth label="Số lượng" type="number"
                                value={formData.quantity}
                                onChange={(e) => handleChange('quantity', e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth label="Trọng số BC" type="number"
                                value={formData.priority}
                                onChange={(e) => handleChange('priority', e.target.value)}
                                helperText="Số nhỏ = ưu tiên cao"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'center', pl: { sm: 2 } }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={formData.active}
                                        onChange={(e) => handleChange('active', e.target.checked)}
                                    />
                                }
                                label="Hoạt động"
                            />
                        </Grid>
                    </Grid>
                    <TextField
                        fullWidth select label="Đơn vị quản lý" required
                        value={formData.org_id}
                        onChange={(e) => handleChange('org_id', e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                    >
                        {(organizations.primary || []).map((org) => (
                            <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>
                        ))}
                    </TextField>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={formData.share_all}
                                onChange={(e) => handleChange('share_all', e.target.checked)}
                                color="secondary"
                            />
                        }
                        label="Chia sẻ với tất cả xí nghiệp"
                    />
                    {!formData.share_all && (
                        <MultiSelectCheckboxes
                            label="Đơn vị phối hợp"
                            placeholder="Chọn đơn vị"
                            options={(organizations.shared || []).filter((org) => org.id !== formData.org_id)}
                            value={formData.shared_org_ids}
                            onChange={(ids) => handleChange('shared_org_ids', ids)}
                        />
                    )}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={handleClose} color="inherit">Hủy</Button>
                <Button variant="contained" onClick={handleSubmit} color="primary">
                    {item ? 'Cập nhật' : 'Thêm mới'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SluiceGateDialog;
