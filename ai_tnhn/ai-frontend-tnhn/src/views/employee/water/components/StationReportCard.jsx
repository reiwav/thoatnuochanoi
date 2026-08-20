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
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Chip
} from '@mui/material';
import {
    IconSend,
    IconHistory,
    IconChevronDown,
    IconChevronUp,
    IconDroplet,
    IconCheck
} from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import dayjs from 'dayjs';

import stationApi from 'api/station';

const parseTimestamp = (ts) => {
    if (!ts) return dayjs();
    if (typeof ts === 'number') {
        if (ts < 10000000000) return dayjs.unix(ts);
        return dayjs(ts);
    }
    return dayjs(ts);
};

const StationReportCard = ({ station, type, latestReading, onReportSuccess }) => {
    const oldId = station.OldId ?? station.old_id ?? station.OldID;
    
    // Dialog states
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedTimeFrame, setSelectedTimeFrame] = useState('CURRENT');
    const [value, setValue] = useState('');
    const [note, setNote] = useState('');
    
    const [submitting, setSubmitting] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // To check if a timeframe is already reported today
    const [reported6h30, setReported6h30] = useState(false);
    const [reported13h30, setReported13h30] = useState(false);

    const loadHistory = async (checkOnly = false) => {
        if (!oldId) return;
        if (!checkOnly) setLoadingHistory(true);
        try {
            const apiMap = {
                lake: stationApi.lake,
                river: stationApi.river
            };
            // Lấy nhiều hơn chút để kiểm tra các ca trong ngày
            const res = await apiMap[type].getHistory(oldId, { limit: 10 });
            const records = Array.isArray(res) ? res : (res?.data || []);
            
            if (!checkOnly) {
                setHistory(records);
            }

            // Kiểm tra trạng thái báo cáo trong ngày
            const todayStr = dayjs().format('YYYY-MM-DD');
            let has6h30 = false;
            let has13h30 = false;
            
            records.forEach(r => {
                const rTime = parseTimestamp(r.timestamp);
                const rDate = rTime.format('YYYY-MM-DD');
                if (rDate === todayStr) {
                    if (rTime.hour() === 6 && rTime.minute() === 30) has6h30 = true;
                    if (rTime.hour() === 13 && rTime.minute() === 30) has13h30 = true;
                }
            });
            setReported6h30(has6h30);
            setReported13h30(has13h30);

        } catch (err) {
            console.error('Failed to load station history:', err);
        } finally {
            if (!checkOnly) setLoadingHistory(false);
        }
    };

    // Load trạng thái báo cáo khi mount để đổi màu nút
    useEffect(() => {
        loadHistory(true);
    }, []);

    useEffect(() => {
        if (historyOpen) {
            loadHistory(false);
        }
    }, [historyOpen]);

    const handleOpenDialog = (timeFrame) => {
        setSelectedTimeFrame(timeFrame);
        setValue('');
        setNote('');
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
    };

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
            let ts = dayjs();
            if (selectedTimeFrame === '06:30') {
                ts = ts.hour(6).minute(30).second(0).millisecond(0);
            } else if (selectedTimeFrame === '13:30') {
                ts = ts.hour(13).minute(30).second(0).millisecond(0);
            }

            await apiMap[type].report(oldId, { 
                value: floatVal, 
                timestamp: ts.toISOString(),
                note: note 
            });
            toast.success(`Đã báo cáo mực nước trạm ${station.TenTram}: ${floatVal}`);
            handleCloseDialog();
            
            if (onReportSuccess) {
                await onReportSuccess();
            }
            // Update the button indicators
            await loadHistory(true);
            if (historyOpen) {
                await loadHistory(false);
            }
        } catch (err) {
            console.error('Failed to submit reading', err);
            toast.error(err.message || 'Lỗi gửi báo cáo');
        } finally {
            setSubmitting(false);
        }
    };

    const getTimeFrameLabel = (tf) => {
        if (tf === '06:30') return '6h30';
        if (tf === '13:30') return '13h30';
        return 'Hiện tại';
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
                                    {parseTimestamp(latestReading.timestamp).format('HH:mm DD/MM')}
                                </Typography>
                            </Box>
                        ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                Chưa có báo cáo
                            </Typography>
                        )}
                    </Box>

                    <Divider />

                    {/* Report Buttons */}
                    <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1, display: 'block' }}>
                            Chọn ca báo cáo:
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                            <Button
                                variant={reported6h30 ? "contained" : "outlined"}
                                color={reported6h30 ? "success" : "inherit"}
                                size="medium"
                                onClick={() => handleOpenDialog('06:30')}
                                startIcon={reported6h30 ? <IconCheck size={18} /> : null}
                                sx={{ borderRadius: '24px', textTransform: 'none', fontWeight: 600, borderColor: reported6h30 ? 'transparent' : 'divider', px: 2.5, py: 0.75, fontSize: '0.95rem' }}
                            >
                                6h30
                            </Button>
                            <Button
                                variant={reported13h30 ? "contained" : "outlined"}
                                color={reported13h30 ? "success" : "inherit"}
                                size="medium"
                                onClick={() => handleOpenDialog('13:30')}
                                startIcon={reported13h30 ? <IconCheck size={18} /> : null}
                                sx={{ borderRadius: '24px', textTransform: 'none', fontWeight: 600, borderColor: reported13h30 ? 'transparent' : 'divider', px: 2.5, py: 0.75, fontSize: '0.95rem' }}
                            >
                                13h30
                            </Button>
                            <Button
                                variant="outlined"
                                color="primary"
                                size="medium"
                                onClick={() => handleOpenDialog('CURRENT')}
                                sx={{ borderRadius: '24px', textTransform: 'none', fontWeight: 600, px: 2.5, py: 0.75, fontSize: '0.95rem' }}
                            >
                                Hiện tại
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
                                                            {parseTimestamp(row.timestamp).format('HH:mm:ss DD/MM/YYYY')}
                                                            {(() => {
                                                                const t = parseTimestamp(row.timestamp);
                                                                if (t.hour() === 6 && t.minute() === 30) return <Chip size="small" label="06:30" sx={{ ml: 1, height: '18px', fontSize: '0.65rem' }} />;
                                                                if (t.hour() === 13 && t.minute() === 30) return <Chip size="small" label="13:30" sx={{ ml: 1, height: '18px', fontSize: '0.65rem' }} />;
                                                                return null;
                                                            })()}
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

            {/* Input Dialog */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: '16px' } }}>
                <form onSubmit={handleSubmit}>
                    <DialogTitle sx={{ pb: 1 }}>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>Nhập liệu: {station.TenTram}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Khung giờ báo cáo: <strong>{getTimeFrameLabel(selectedTimeFrame)}</strong>
                        </Typography>
                    </DialogTitle>
                    <DialogContent>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <TextField
                                fullWidth
                                label="Mực nước (m)"
                                placeholder="Nhập mực nước..."
                                type="number"
                                step="any"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                disabled={submitting}
                                autoFocus
                                required
                                slotProps={{
                                    input: { sx: { borderRadius: '12px', fontWeight: 600 } },
                                    htmlInput: { inputMode: 'decimal' }
                                }}
                            />
                            <TextField
                                fullWidth
                                label="Ghi chú (Tuỳ chọn)"
                                placeholder="Nhập ghi chú hiện trường..."
                                multiline
                                rows={3}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                disabled={submitting}
                                slotProps={{
                                    input: { sx: { borderRadius: '12px' } }
                                }}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ p: 2, pt: 0 }}>
                        <Button onClick={handleCloseDialog} color="inherit" disabled={submitting} sx={{ borderRadius: '10px', fontWeight: 600 }}>
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={submitting || !value}
                            sx={{ borderRadius: '10px', fontWeight: 700, px: 3 }}
                            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <IconSend size={16} />}
                        >
                            Gửi dữ liệu
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Card>
    );
};

export default StationReportCard;
