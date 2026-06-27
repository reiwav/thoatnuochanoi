import React from 'react';
import {
    Grid, Stack, Typography, TextField, FormControl, InputLabel, Select, MenuItem, Box, Button, IconButton
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import ContractDriveUpload from '../ContractDriveUpload';

const ContractGeneralTab = ({
    values,
    setValues,
    categories,
    handleChange,
    uploading,
    setUploading
}) => {
    return (
        <Grid container spacing={2}>
            {/* Left Column (6/12): General Configuration */}
            <Grid item xs={12} md={6}>
                <Stack spacing={2} sx={{ p: 2, bgcolor: '#ffffff', borderRadius: '12px', border: '1px solid rgba(226, 232, 240, 0.8)', boxShadow: '0 2px 8px rgba(0,0,0,0.01)', height: '100%' }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', borderBottom: '1px solid #f1f5f9', pb: 0.75, mb: 0.5 }}>
                        Cấu hình chung
                    </Typography>
                    <TextField
                        fullWidth
                        size="small"
                        label="Số hợp đồng"
                        name="contract_number"
                        value={values.contract_number}
                        onChange={handleChange}
                        required
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: 'white' } }}
                    />
                    <TextField
                        fullWidth
                        size="small"
                        label="Tên hợp đồng"
                        name="name"
                        value={values.name}
                        onChange={handleChange}
                        required
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: 'white' } }}
                    />
                    <FormControl fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: 'white' } }}>
                        <InputLabel>Danh mục</InputLabel>
                        <Select
                            name="category_id"
                            value={values.category_id}
                            onChange={handleChange}
                            label="Danh mục"
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
                        size="small"
                        label="Tên chủ đầu tư"
                        name="investor_name"
                        value={values.investor_name}
                        onChange={handleChange}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: 'white' } }}
                    />
                    <Stack direction="row" spacing={2}>
                        <DatePicker
                            label="Ngày bắt đầu"
                            value={values.start_date}
                            onChange={(val) => setValues({ ...values, start_date: val })}
                            format="DD/MM/YYYY"
                            slotProps={{ textField: { fullWidth: true, size: 'small', sx: { '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: 'white' } } } }}
                        />
                        <DatePicker
                            label="Ngày hết hạn"
                            value={values.end_date}
                            onChange={(val) => setValues({ ...values, end_date: val })}
                            format="DD/MM/YYYY"
                            slotProps={{ textField: { fullWidth: true, size: 'small', sx: { '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: 'white' } } } }}
                        />
                    </Stack>
                    <TextField
                        fullWidth
                        size="small"
                        label="Nội dung chính"
                        name="content"
                        multiline
                        rows={2.5}
                        value={values.content || ''}
                        onChange={handleChange}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: 'white' } }}
                    />
                    <TextField
                        fullWidth
                        size="small"
                        label="Ghi chú"
                        name="note"
                        multiline
                        rows={1.5}
                        value={values.note}
                        onChange={handleChange}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: 'white' } }}
                    />
                </Stack>
            </Grid>

            {/* Right Column (6/12): Phụ trợ (Liên danh & Files) */}
            <Grid item xs={12} md={6}>
                <Stack spacing={2} sx={{ height: '100%' }}>
                    <Box 
                        sx={{ 
                            p: 2, 
                            border: '1px solid rgba(226, 232, 240, 0.8)', 
                            borderRadius: '12px', 
                            bgcolor: '#ffffff', 
                            boxShadow: '0 2px 8px rgba(0,0,0,0.01)',
                            flex: 1
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>Thành viên liên danh</Typography>
                            <Button 
                                size="small" 
                                startIcon={<IconPlus size={12} />} 
                                onClick={() => {
                                    setValues(prev => ({
                                        ...prev,
                                        joint_venture_members: [...(prev.joint_venture_members || []), '']
                                    }));
                                }}
                                variant="outlined"
                                color="secondary"
                                sx={{ borderRadius: '6px', textTransform: 'none', fontWeight: 600, py: 0.25 }}
                            >
                                Thêm thành viên
                            </Button>
                        </Box>
                        <Stack spacing={1} sx={{ maxHeight: '180px', overflowY: 'auto', pr: 0.5 }}>
                            {(!values.joint_venture_members || values.joint_venture_members.length === 0) ? (
                                <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>Chưa có thành viên liên danh.</Typography>
                            ) : (
                                values.joint_venture_members.map((member, index) => (
                                    <Stack key={index} direction="row" spacing={1} alignItems="center">
                                        <TextField
                                            size="small"
                                            placeholder={`Tên thành viên ${index + 1}`}
                                            fullWidth
                                            value={member || ''}
                                            onChange={(e) => {
                                                const newMembers = [...values.joint_venture_members];
                                                newMembers[index] = e.target.value;
                                                setValues({ ...values, joint_venture_members: newMembers });
                                            }}
                                            sx={{ bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
                                        />
                                        <IconButton 
                                            size="small" 
                                            color="error" 
                                            onClick={() => {
                                                const newMembers = values.joint_venture_members.filter((_, i) => i !== index);
                                                setValues({ ...values, joint_venture_members: newMembers });
                                            }}
                                            sx={{ bgcolor: '#fee2e2' }}
                                        >
                                            <IconTrash size={14} />
                                        </IconButton>
                                    </Stack>
                                ))
                            )}
                        </Stack>
                    </Box>

                    <Box 
                        sx={{ 
                            p: 2, 
                            border: '1px solid rgba(226, 232, 240, 0.8)', 
                            borderRadius: '12px', 
                            bgcolor: '#ffffff', 
                            boxShadow: '0 2px 8px rgba(0,0,0,0.01)',
                            flex: 1
                        }}
                    >
                        <ContractDriveUpload 
                            values={values} 
                            setValues={setValues} 
                            uploading={uploading} 
                            setUploading={setUploading} 
                        />
                    </Box>
                </Stack>
            </Grid>
        </Grid>
    );
};

export default ContractGeneralTab;
