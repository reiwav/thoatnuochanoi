import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    useTheme,
    useMediaQuery
} from '@mui/material';
import { IconAlertTriangle } from '@tabler/icons-react';

/**
 * Reusable confirmation dialog with premium MUI design
 * @param {boolean} open - Dialog open state
 * @param {string} title - Dialog title
 * @param {string} description - Dialog message/description
 * @param {string} itemName - Name of the item being deleted (will be bolded)
 * @param {function} onConfirm - Confirm action handler
 * @param {function} onClose - Close/Cancel action handler
 * @param {boolean} loading - Loading state for the confirm button
 * @param {string} confirmText - Text for the confirm button
 * @param {string} cancelText - Text for the cancel button
 * @param {string} color - Color of the confirm button (primary, error, warning, etc.)
 */
const ConfirmDialog = ({
    open,
    title = 'Xác nhận xóa',
    description = 'Bạn có chắc chắn muốn xóa mục này? Hành động này không thể hoàn tác.',
    itemName = '',
    onConfirm,
    onClose,
    loading = false,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    color = 'error'
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    return (
        <Dialog
            open={open}
            onClose={onClose}
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '24px',
                    p: 1.5,
                    boxShadow: theme.shadows[10]
                }
            }}
        >
            <DialogTitle id="confirm-dialog-title" sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: color === 'error' ? 'error.light' : 'warning.light',
                        color: color === 'error' ? 'error.main' : 'warning.dark'
                    }}>
                        <IconAlertTriangle size={24} />
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                        {title}
                    </Typography>
                </Box>
            </DialogTitle>
            <DialogContent>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1, fontWeight: 500, lineHeight: 1.6 }}>
                    {itemName ? (
                        <>
                            Bạn có chắc chắn muốn xóa <strong>{itemName}</strong>? Hành động này không thể hoàn tác.
                        </>
                    ) : description}
                </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 2, pb: 2, pt: 1, gap: 1 }}>
                <Button
                    fullWidth={isMobile}
                    onClick={onClose}
                    color="inherit"
                    disabled={loading}
                    sx={{
                        borderRadius: '12px',
                        fontWeight: 700,
                        py: 1.2,
                        minWidth: 100
                    }}
                >
                    {cancelText}
                </Button>
                <Button
                    fullWidth={isMobile}
                    onClick={onConfirm}
                    variant="contained"
                    color={color}
                    disabled={loading}
                    sx={{
                        borderRadius: '12px',
                        fontWeight: 800,
                        py: 1.2,
                        minWidth: 120,
                        boxShadow: 3
                    }}
                >
                    {loading ? 'Đang xử lý...' : confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ConfirmDialog;
