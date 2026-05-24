import React from 'react';
import {
  Box, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button
} from '@mui/material';
import { IconAlertTriangle } from '@tabler/icons-react';

const ConfirmQuickFinishDialog = ({ open, onClose, point, onConfirm }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { borderRadius: 4, p: 1, minWidth: 280 } } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'error.lighter', color: 'error.main', display: 'flex' }}>
          <IconAlertTriangle size={24} />
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Xác nhận kết thúc ngập
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ py: 1 }}>
          Bạn có chắc chắn muốn kết thúc nhanh tình trạng ngập tại điểm:
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main', mb: 1 }}>
          {point?.name}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          * Thao tác này sẽ đưa độ sâu về 0, cập nhật trạng thái trạm về Bình thường và đóng đợt ngập ngay lập tức.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600 }}>
          Hủy bỏ
        </Button>
        <Button onClick={onConfirm} variant="contained" color="error" sx={{ borderRadius: 2, px: 3, fontWeight: 700 }}>
          Xác nhận kết thúc
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmQuickFinishDialog;
