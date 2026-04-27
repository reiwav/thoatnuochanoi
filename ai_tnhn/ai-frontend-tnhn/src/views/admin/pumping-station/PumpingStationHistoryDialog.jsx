import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogActions, DialogContent, DialogTitle, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, useMediaQuery, Stack, Box, Typography, Divider, IconButton, Grid
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconX, IconClock, IconUser, IconEngine } from '@tabler/icons-react';
import pumpingStationApi from 'api/pumpingStation';
import dayjs from 'dayjs';

const PumpingStationHistoryDialog = ({ open, handleClose, item }) => {
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
            const response = await pumpingStationApi.getHistory(item.id);
            setHistory(response.data || response || []);
        } catch (error) {
            console.error('Failed to load history', error);
        } finally {
            setLoading(false);
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
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>Lịch sử vận hành: {item?.name}</Typography>
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
                                <TableCell sx={{ fontWeight: 700 }}>Thời gian</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Nhân viên</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, color: 'error.main' }}>Vận hành</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, color: 'success.main' }}>Dừng</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, color: 'warning.dark' }}>Bảo dưỡng</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700 }}>Ko tín hiệu</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Ghi chú</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {history.length > 0 ? (
                                history.map((row) => (
                                    <TableRow key={row.id} hover>
                                        <TableCell>{dayjs(row.updated_at * 1000).format('DD/MM/YYYY HH:mm')}</TableCell>
                                        <TableCell>{row.user_name}</TableCell>
                                        <TableCell align="center" sx={{ color: 'error.main', fontWeight: 700 }}>{row.operating_count}</TableCell>
                                        <TableCell align="center" sx={{ color: 'success.main', fontWeight: 700 }}>{row.closed_count}</TableCell>
                                        <TableCell align="center" sx={{ color: 'warning.dark', fontWeight: 700 }}>{row.maintenance_count}</TableCell>
                                        <TableCell align="center" sx={{ color: 'text.secondary', fontWeight: 700 }}>{row.no_signal_count}</TableCell>
                                        <TableCell sx={{ fontSize: '0.8rem' }}>{row.note}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>Chưa có dữ liệu báo cáo</TableCell>
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
                                <Grid container spacing={1} sx={{ mb: 1.5 }}>
                                    <Grid item xs={3}>
                                        <Box sx={{ p: 1, bgcolor: 'error.lighter', borderRadius: 1.5, textAlign: 'center' }}>
                                            <Typography variant="caption" color="error.main" sx={{ fontWeight: 800, fontSize: '0.6rem', display: 'block' }}>CHẠY</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 900 }}>{row.operating_count}</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={3}>
                                        <Box sx={{ p: 1, bgcolor: 'success.lighter', borderRadius: 1.5, textAlign: 'center' }}>
                                            <Typography variant="caption" color="success.main" sx={{ fontWeight: 800, fontSize: '0.6rem', display: 'block' }}>DỪNG</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 900 }}>{row.closed_count}</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={3}>
                                        <Box sx={{ p: 1, bgcolor: 'warning.lighter', borderRadius: 1.5, textAlign: 'center' }}>
                                            <Typography variant="caption" color="warning.dark" sx={{ fontWeight: 800, fontSize: '0.6rem', display: 'block' }}>B.DƯỠNG</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 900 }}>{row.maintenance_count}</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={3}>
                                        <Box sx={{ p: 1, bgcolor: 'grey.100', borderRadius: 1.5, textAlign: 'center' }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, fontSize: '0.6rem', display: 'block' }}>KO T.H</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 900 }}>{row.no_signal_count}</Typography>
                                        </Box>
                                    </Grid>
                                </Grid>
                                {row.note && (
                                    <>
                                        <Divider sx={{ borderStyle: 'dashed', mb: 1 }} />
                                        <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                                            {row.note}
                                        </Typography>
                                    </>
                                )}
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

export default PumpingStationHistoryDialog;
