import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, IconButton, Typography, Box
} from '@mui/material';
import { IconX } from '@tabler/icons-react';

const StationDialogWrapper = ({ open, onClose, onSave, title, children, loading, isEdit }) => {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle component="div" sx={{ fontWeight: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, pt: 2, pb: 1 }}>
                <Typography variant="h3" sx={{ fontWeight: 900 }}>{title}</Typography>
                <IconButton onClick={onClose} size="small"><IconX size={24} /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 2 }}>
                <Box sx={{
                    mt: 1,
                    '& .MuiInputLabel-root': { fontSize: '1rem', fontWeight: 600 },
                    '& .MuiInputBase-input': { fontSize: '1rem' },
                    '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' }
                }}>
                    {children}
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Button onClick={onClose} color="inherit" sx={{ fontWeight: 700, fontSize: '1rem' }}>Hủy</Button>
                <Button 
                    variant="contained" 
                    onClick={onSave} 
                    color="primary" 
                    disabled={loading}
                    sx={{ px: 3, fontWeight: 700, fontSize: '1rem', borderRadius: 2 }}
                >
                    {isEdit ? 'Cập nhật' : 'Thêm mới'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default StationDialogWrapper;
