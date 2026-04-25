import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogActions, DialogContent, DialogTitle, Button, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, Paper, useMediaQuery, Stack, Box, Typography, Divider, IconButton
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconX, IconClock, IconUser, IconDroplets } from '@tabler/icons-react';
import wastewaterTreatmentApi from 'api/wastewaterTreatment';
import dayjs from 'dayjs';

const WastewaterTreatmentHistoryDialog = ({ open, handleClose, item }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && item) {
            loadHistory();
        }
    }, [open, item]);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const response = await wastewaterTreatmentApi.getHistory(item.id);
            setHistory(response.data || response || []);
        } catch (error) {
            console.error('Failed to load history', error);
        } finally {
            setHistory(false);
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose} 
            fullWidth 
            maxWidth="md"
            fullScreen={isMobile}
            slotProps={{ paper: { sx: { borderRadius: isMobile ? 0 : 3 } } }}
        >
            <DialogTitle sx={{ p: 2, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>Lịch sử báo cáo XLNT: {item?.name}</Typography>
                    <IconButton onClick={handleClose} size="small"><IconX size={20} /></IconButton>
                </Stack>
            </DialogTitle>
            <DialogContent sx={{ p: isMobile ? 1.5 : 3 }}>
                {/* Desktop Table View */}
                <TableContainer 
                    component={Paper} 
                    variant="outlined" 
                    sx={{ 
                        display: { xs: 'none', md: 'block' },
                        borderRadius: 2,
                        overflow: 'hidden' 
                    }}
                >
                    <Table size="small">
                        <TableHead sx={{ bgcolor: 'grey.100' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, width: 160 }}>Thời gian</TableCell>
                                <TableCell sx={{ fontWeight: 700, width: 200 }}>Nhân viên</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Nhận xét / Ghi chú vận hành</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {history.length > 0 ? (
                                history.map((row) => (
                                    <TableRow key={row.id} hover>
                                        <TableCell>{dayjs(row.timestamp * 1000).format('DD/MM/YYYY HH:mm')}</TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <IconUser size={16} />
                                                <Typography variant="body2">{row.user_name}</Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.9rem', color: 'text.primary', whiteSpace: 'pre-wrap' }}>
                                            {row.note}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} align="center" sx={{ py: 3 }}>Chưa có dữ liệu báo cáo</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Mobile Card View */}
                <Stack spacing={2} sx={{ display: { xs: 'flex', md: 'none' } }}>
                    {history.length > 0 ? (
                        history.map((row) => (
                            <Paper key={row.id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <IconClock size={16} />
                                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                            {dayjs(row.timestamp * 1000).format('DD/MM HH:mm')}
                                        </Typography>
                                    </Stack>
                                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                                        <IconUser size={14} /> {row.user_name}
                                    </Typography>
                                </Box>
                                <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
                                    <Typography variant="body2" sx={{ color: 'text.primary', fontStyle: row.note ? 'normal' : 'italic', whiteSpace: 'pre-wrap' }}>
                                        {row.note || 'Không có ghi chú'}
                                    </Typography>
                                </Box>
                            </Paper>
                        ))
                    ) : (
                        <Box sx={{ py: 5, textAlign: 'center' }}>
                            <Typography color="textSecondary">Chưa có dữ liệu báo cáo</Typography>
                        </Box>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Button variant="outlined" onClick={handleClose} fullWidth={isMobile}>Đóng</Button>
            </DialogActions>
        </Dialog>
    );
};

export default WastewaterTreatmentHistoryDialog;
