import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';

const ConstructionReportDialog = ({
    open,
    onClose,
    exporting,
    reportDate,
    setReportDate,
    handleConstructionReport
}) => {
    return (
        <Dialog 
            open={open} 
            onClose={() => !exporting && onClose()} 
            slotProps={{ paper: { sx: { borderRadius: '16px', minWidth: 320 } } }}
        >
            <DialogTitle sx={{ fontWeight: 800 }}>Xuất báo cáo công trình</DialogTitle>
            <DialogContent>
                <TextField
                    fullWidth
                    type="date"
                    label="Chọn ngày"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ mt: 1 }}
                />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} disabled={exporting}>Hủy</Button>
                <Button variant="contained" onClick={handleConstructionReport} disabled={exporting}>
                    {exporting ? 'Đang xuất...' : 'Xuất báo cáo'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ConstructionReportDialog;
