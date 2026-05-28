import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, FormControl, InputLabel,
    Select, MenuItem, Switch, FormControlLabel, CircularProgress,
    Box, Typography
} from '@mui/material';

// Hook
import { useContractCategoryDialog } from './hooks/useContractCategoryDialog';

const ContractCategoryDialog = ({ open, onClose, onSubmit, category, isEdit }) => {
    const {
        values,
        parents,
        loading,
        handleChange
    } = useContractCategoryDialog({ open, category, isEdit });

    const handleSave = () => {
        if (!values.name || !values.code) {
            return;
        }
        onSubmit(values);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            slotProps={{
                paper: {
                    sx: { borderRadius: '16px' }
                }
            }}
        >
            <DialogTitle sx={{ p: 3, pb: 2 }}>
                <Typography variant="h3" component="div" sx={{ fontWeight: 700 }}>
                    {isEdit ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
                </Typography>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TextField
                        fullWidth
                        label="Tên danh mục"
                        name="name"
                        variant="outlined"
                        placeholder="Nhập tên danh mục (ví dụ: Hợp đồng kinh tế)"
                        value={values.name}
                        onChange={handleChange}
                        required
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                    />

                    <TextField
                        fullWidth
                        label="Mã danh mục"
                        name="code"
                        variant="outlined"
                        placeholder="Mã duy nhất (ví dụ: HD_KT_001)"
                        value={values.code}
                        onChange={handleChange}
                        required
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                    />

                    <TextField
                        fullWidth
                        label="Thứ tự ưu tiên"
                        name="order"
                        type="number"
                        placeholder="0"
                        value={values.order}
                        onChange={handleChange}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                    />

                    <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
                        <InputLabel>Danh mục cấp trên</InputLabel>
                        <Select
                            fullWidth
                            name="parent_id"
                            value={values.parent_id}
                            onChange={handleChange}
                            label="Danh mục cấp trên"
                        >
                            <MenuItem value=""><em>-- Đây là danh mục gốc (Level 0) --</em></MenuItem>
                            {loading ? (
                                <MenuItem disabled sx={{ justifyContent: 'center' }}><CircularProgress size={20} /></MenuItem>
                            ) : (
                                parents.map((p) => (
                                    <MenuItem key={p.id} value={p.id} sx={{ py: 1.5 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                color: p.level > 0 ? '#1e88e5' : '#757575',
                                                fontWeight: p.level === 0 ? 600 : 400
                                            }}>
                                                {'\u00A0'.repeat(p.level * 4)}
                                                {p.level > 0 ? '└── ' : '📁 '}
                                            </span>
                                            <Typography sx={{ ml: 1 }}>{p.name}</Typography>
                                        </Box>
                                    </MenuItem>
                                ))
                            )}
                        </Select>
                    </FormControl>

                    <TextField
                        fullWidth
                        label="Mô tả danh mục"
                        name="description"
                        multiline
                        rows={3}
                        placeholder="Ghi chú thêm về danh mục này..."
                        value={values.description}
                        onChange={handleChange}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                    />

                    <Box sx={{
                        p: 2.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        bgcolor: 'grey.50',
                        transition: 'all 0.3s',
                        '&:hover': { bgcolor: 'white', borderColor: 'primary.main', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }
                    }}>
                        <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Cấu hình trạng thái</Typography>
                        </Box>
                        <FormControlLabel
                            control={
                                <Switch
                                    name="status"
                                    checked={values.status}
                                    onChange={handleChange}
                                    color="primary"
                                />
                            }
                            label={values.status ? "Đang hiệu lực" : "Đang tạm khóa"}
                            labelPlacement="start"
                            sx={{
                                m: 0,
                                '& .MuiFormControlLabel-label': { fontWeight: 700, color: values.status ? 'success.main' : 'error.main', fontSize: '0.875rem' }
                            }}
                        />
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 1 }}>
                <Button
                    onClick={onClose}
                    variant="text"
                    color="inherit"
                    sx={{ borderRadius: '10px', px: 3, fontWeight: 600 }}
                >
                    Hủy bỏ
                </Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    color="primary"
                    disabled={!values.name || !values.code}
                    sx={{
                        borderRadius: '10px',
                        px: 5,
                        py: 1,
                        fontSize: '1rem',
                        fontWeight: 700,
                        boxShadow: '0 4px 14px 0 rgba(0,118,255,0.39)',
                        '&:hover': { boxShadow: '0 6px 20px rgba(0,118,255,0.23)' }
                    }}
                >
                    {isEdit ? 'Cập nhật danh mục' : 'Xác nhận tạo mới'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ContractCategoryDialog;
