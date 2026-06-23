import React, { useState, useEffect } from 'react';
import {
    Box,
    CircularProgress,
    Typography,
    Card,
    CardContent,
    TextField,
    Button,
    Stack,
    Divider,
    Collapse,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    Paper
} from '@mui/material';
import {
    IconSend,
    IconHistory,
    IconChevronDown,
    IconChevronUp,
    IconDroplet
} from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import dayjs from 'dayjs';

import stationApi from 'api/station';

const StationReportCard = ({ station, type, latestReading, onReportSuccess }) => {
    const oldId = station.OldId ?? station.old_id ?? station.OldID;
    const [value, setValue] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const loadHistory = async () => {
        if (!oldId) return;
        setLoadingHistory(true);
        try {
            const apiMap = {
                lake: stationApi.lake,
                river: stationApi.river
            };
            const res = await apiMap[type].getHistory(oldId, { limit: 5 });
            setHistory(Array.isArray(res) ? res : (res?.data || []));
        } catch (err) {
            console.error('Failed to load station history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (historyOpen) {
            loadHistory();
        }
    }, [historyOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!value || isNaN(value)) {
            toast.error('Vui lòng nhập giá trị mực nước hợp lệ (số)');
            return;
        }

        const floatVal = parseFloat(value);
        setSubmitting(true);
        try {
            const apiMap = {
                lake: stationApi.lake,
                river: stationApi.river
            };
            await apiMap[type].report(oldId, { value: floatVal });
            toast.success(`Đã báo cáo mực nước trạm ${station.TenTram}: ${floatVal}`);
            setValue('');
            if (onReportSuccess) {
                await onReportSuccess();
            }
            if (historyOpen) {
                await loadHistory();
            }
        } catch (err) {
            console.error('Failed to submit reading', err);
            toast.error(err.message || 'Lỗi gửi báo cáo');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card sx={{
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            mb: 2,
            overflow: 'hidden'
        }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <IconDroplet size={18} style={{ color: type === 'lake' ? '#2196f3' : '#00bcd4' }} />
                                {station.TenTram}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {station.DiaChi || station.TenPhuong || 'Chưa cập nhật địa chỉ'}
                            </Typography>
                        </Box>
                        {latestReading ? (
                            <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="h4" color="primary.main" sx={{ fontWeight: 800 }}>
                                    {latestReading.value}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {dayjs(latestReading.timestamp).format('HH:mm DD/MM')}
                                </Typography>
                            </Box>
                        ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                Chưa có báo cáo
                            </Typography>
                        )}
                    </Box>

                    <Divider />

                    {/* Report Form */}
                    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <TextField
                                fullWidth
                                placeholder="Nhập mực nước..."
                                size="small"
                                type="number"
                                step="any"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                disabled={submitting}
                                slotProps={{
                                    input: {
                                        sx: { borderRadius: '12px', fontWeight: 600 }
                                    }
                                }}
                            />
                            <Button
                                variant="contained"
                                color="primary"
                                type="submit"
                                disabled={submitting || !value}
                                sx={{
                                    borderRadius: '12px',
                                    fontWeight: 700,
                                    px: 2,
                                    height: '40px',
                                    minWidth: '100px',
                                    boxShadow: 'none'
                                }}
                                startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <IconSend size={16} />}
                            >
                                Gửi
                            </Button>
                        </Stack>
                    </Box>

                    {/* Expandable History Section */}
                    <Box>
                        <Button
                            variant="text"
                            color="secondary"
                            size="small"
                            onClick={() => setHistoryOpen(!historyOpen)}
                            startIcon={<IconHistory size={16} />}
                            endIcon={historyOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                            sx={{ fontWeight: 600, fontSize: '0.8rem', p: 0, '&:hover': { background: 'transparent' } }}
                        >
                            Lịch sử đo gần đây
                        </Button>

                        <Collapse in={historyOpen}>
                            <Box sx={{ mt: 1.5 }}>
                                {loadingHistory ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                        <CircularProgress size={20} color="secondary" />
                                    </Box>
                                ) : history.length === 0 ? (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', pl: 1 }}>
                                        Không có dữ liệu đo đạc gần đây.
                                    </Typography>
                                ) : (
                                    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}>
                                        <Table size="small">
                                            <TableBody>
                                                {history.map((row, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell sx={{ fontSize: '0.8rem', py: 1 }}>
                                                            {dayjs(row.timestamp).format('HH:mm:ss DD/MM/YYYY')}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 800, color: 'primary.main', fontSize: '0.9rem', py: 1 }}>
                                                            {row.value}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}
                            </Box>
                        </Collapse>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default StationReportCard;
