import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Typography, 
    Stack, FormControl, InputLabel, Select, MenuItem, CircularProgress, Grid
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import ContractStages from './ContractStages';
import ContractDriveUpload from './ContractDriveUpload';

// Hook
import { useContractDialog } from './hooks/useContractDialog';

const ContractDialog = ({ open, onClose, onSubmit, contract, isEdit, parentContract }) => {
    const {
        values,
        setValues,
        uploading,
        setUploading,
        submitting,
        categories,
        handleChange,
        handleStageChange,
        addStage,
        removeStage,
        handleSave
    } = useContractDialog({ open, onClose, onSubmit, contract, isEdit, parentContract });

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Dialog 
                open={open} 
                onClose={(event, reason) => {
                    if (reason === 'backdropClick') return;
                    onClose();
                }}
                maxWidth="lg" 
                fullWidth
                slotProps={{ paper: { sx: { borderRadius: '16px' } } }}
            >
                <DialogTitle sx={{ p: 3, pb: 2 }}>
                    <Typography variant="h3" component="div" sx={{ fontWeight: 700 }}>
                        {values.parent_id ? (isEdit ? 'Chỉnh sửa phụ lục hợp đồng' : 'Thêm phụ lục hợp đồng mới') : (isEdit ? 'Chỉnh sửa hợp đồng' : 'Thêm hợp đồng mới')}
                    </Typography>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 4 }}>
                    <Grid container spacing={4}>
                        {/* Left Column: General Info & Upload */}
                        <Grid item xs={12} md={6}>
                            <Stack spacing={3}>
                                <TextField
                                    fullWidth
                                    label="Số hợp đồng / Phụ lục"
                                    name="contract_number"
                                    value={values.contract_number}
                                    onChange={handleChange}
                                    required
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                                />

                                <TextField
                                    fullWidth
                                    label="Tên hợp đồng"
                                    name="name"
                                    value={values.name}
                                    onChange={handleChange}
                                    required
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                                />

                                <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
                                    <InputLabel>Danh mục</InputLabel>
                                    <Select
                                        name="category_id"
                                        value={values.category_id}
                                        onChange={handleChange}
                                        label="Danh mục"
                                        disabled={!!values.parent_id}
                                    >
                                        {categories.map((c) => (
                                            <MenuItem key={c.id} value={c.id}>
                                                {'\u00A0'.repeat(c.level * 4)}
                                                {c.level > 0 ? '└── ' : ''}
                                                {c.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <TextField
                                    fullWidth
                                    label="Tên chủ đầu tư"
                                    name="investor_name"
                                    value={values.investor_name}
                                    onChange={handleChange}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                                />

                                <TextField
                                    fullWidth
                                    label="Thành viên liên danh (nếu có)"
                                    name="jv_members"
                                    value={values.jv_members}
                                    onChange={handleChange}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                                />

                                <Stack direction="row" spacing={2}>
                                    <DatePicker
                                        label="Ngày bắt đầu"
                                        value={values.start_date}
                                        onChange={(val) => setValues({ ...values, start_date: val })}
                                        format="DD/MM/YYYY"
                                        slotProps={{ textField: { fullWidth: true, sx: { '& .MuiOutlinedInput-root': { borderRadius: '12px' } } } }}
                                    />
                                    <DatePicker
                                        label="Ngày hết hạn"
                                        value={values.end_date}
                                        onChange={(val) => setValues({ ...values, end_date: val })}
                                        format="DD/MM/YYYY"
                                        slotProps={{ textField: { fullWidth: true, sx: { '& .MuiOutlinedInput-root': { borderRadius: '12px' } } } }}
                                    />
                                </Stack>

                                <TextField
                                    fullWidth
                                    label="Ghi chú"
                                    name="note"
                                    multiline
                                    rows={3}
                                    value={values.note}
                                    onChange={handleChange}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                                />

                                <ContractDriveUpload 
                                    values={values} 
                                    setValues={setValues} 
                                    uploading={uploading} 
                                    setUploading={setUploading} 
                                />
                            </Stack>
                        </Grid>

                        {/* Right Column: Stages */}
                        <Grid item xs={12} md={6}>
                            <ContractStages 
                                stages={values.stages}
                                handleStageChange={handleStageChange}
                                addStage={addStage}
                                removeStage={removeStage}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1 }}>
                    <Button onClick={onClose} color="inherit" disabled={submitting || uploading}>Hủy bỏ</Button>
                    <Button 
                        onClick={handleSave} 
                        variant="contained" 
                        color="secondary"
                        disabled={!values.name || submitting || uploading}
                        startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
                        sx={{ borderRadius: '10px', px: 4, fontWeight: 700 }}
                    >
                        {submitting ? 'Đang lưu...' : (isEdit ? 'Cập nhật' : 'Thêm mới')}
                    </Button>
                </DialogActions>
            </Dialog>
        </LocalizationProvider>
    );
};

export default ContractDialog;
