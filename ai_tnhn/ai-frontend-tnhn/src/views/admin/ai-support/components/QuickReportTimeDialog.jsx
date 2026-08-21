import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box
} from '@mui/material';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

const QuickReportTimeDialog = ({ open, onClose, onSubmit }) => {
    const [selectedTime, setSelectedTime] = useState(dayjs());

    // Reset time to current whenever dialog opens
    useEffect(() => {
        if (open) {
            setSelectedTime(dayjs());
        }
    }, [open]);

    const handleConfirm = () => {
        if (selectedTime) {
            onSubmit(selectedTime.unix());
        }
        onClose();
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth="xs" 
            fullWidth
            sx={{ '& .MuiDialog-container': { alignItems: 'flex-start' } }}
            PaperProps={{ sx: { mt: { xs: 5, md: 10 }, minHeight: 400 } }}
        >
            <DialogTitle>
                <Typography variant="h4">Chọn mốc thời gian trước mưa</Typography>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                        Vui lòng chọn thời điểm trước mưa để lấy dữ liệu mực nước Sông, Hồ.
                    </Typography>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DateTimePicker
                            label="Ngày, Giờ, Phút"
                            value={selectedTime}
                            onChange={(newValue) => setSelectedTime(newValue)}
                            format="DD/MM/YYYY HH:mm"
                            ampm={false}
                            slotProps={{
                                textField: { fullWidth: true }
                            }}
                        />
                    </LocalizationProvider>
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} color="inherit">
                    Hủy
                </Button>
                <Button onClick={handleConfirm} variant="contained" color="primary">
                    Tạo báo cáo
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default QuickReportTimeDialog;
