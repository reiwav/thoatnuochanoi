import React, { useState, useEffect } from 'react';
import {
    Box,
    TextField,
    Button,
    Stack,
    Typography,
    Paper,
    Avatar,
    Divider,
    Pagination,
    CircularProgress,
    List,
    ListItem,
    ListItemText,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import {
    IconDroplets,
    IconClock,
    IconCheck,
    IconHistory,
    IconUser
} from '@tabler/icons-react';
import wastewaterTreatmentApi from 'api/wastewaterTreatment';
import { toast } from 'react-hot-toast';
import dayjs from 'dayjs';
import PermissionGuard from 'ui-component/PermissionGuard';

const WastewaterTreatmentReport = ({ station, onSuccess }) => {
    const theme = useTheme();
    const [formData, setFormData] = useState({
        note: ''
    });
    const [history, setHistory] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const perPage = 10;

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await wastewaterTreatmentApi.getHistory(station.id, { 
                page: page, 
                per_page: perPage 
            });
            // Ensure we handle both potential response formats ({data, total} or just list)
            if (res && res.data) {
                setHistory(res.data);
                setTotal(res.total || 0);
            } else if (Array.isArray(res)) {
                setHistory(res);
                setTotal(res.length);
            }
        } catch (error) {
            console.error('Failed to fetch history', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (station?.id) {
            fetchHistory();
        }
    }, [station.id, page]);

    const handleSubmit = async () => {
        if (!formData.note.trim()) {
            toast.error('Vui lòng nhập nhận xét');
            return;
        }

        try {
            const payload = {
                note: formData.note
            };

            await wastewaterTreatmentApi.report(station.id, payload);
            toast.success('Gửi báo cáo thành công');
            setFormData({ note: '' });
            
            // Refresh history and parent state
            if (page === 1) {
                fetchHistory();
            } else {
                setPage(1);
            }
            
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Báo cáo thất bại');
        }
    };

    const handlePageChange = (event, value) => {
        setPage(value);
    };

    return (
        <Box sx={{ width: '100%' }}>
            {/* Header Section */}
            <Box sx={{ mb: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{ flex: 1, pr: 2 }}>
                        <Typography variant="h2" sx={{ fontWeight: 900, mb: 0.5, fontSize: { xs: '1.5rem', sm: '2.2rem' }, color: 'primary.dark' }}>
                            {station.name}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                            Báo cáo vận hành trạm xử lý nước thải
                        </Typography>
                    </Box>
                    <Avatar
                        sx={{
                            width: { xs: 56, sm: 80 },
                            height: { xs: 56, sm: 80 },
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                            boxShadow: `0 8px 24px -8px ${alpha(theme.palette.primary.main, 0.4)}`
                        }}
                    >
                        <IconDroplets size={theme.breakpoints.down('sm') ? 32 : 40} />
                    </Avatar>
                </Stack>
            </Box>

            {/* Input Section */}
            <Paper 
                elevation={0} 
                sx={{ 
                    p: { xs: 2, sm: 3 }, 
                    borderRadius: '24px', 
                    border: '1px solid', 
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
                    mb: 2
                }}
            >
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.primary' }}>
                    <IconClock size={28} color={theme.palette.primary.main} />
                    Cập nhật nhận xét vận hành
                </Typography>

                <Box sx={{ width: '100%' }}>
                    <TextField
                        fullWidth
                        placeholder="Nhập ghi chú vận hành, tình trạng nước đầu ra..."
                        name="note"
                        multiline
                        rows={3}
                        value={formData.note}
                        onChange={(e) => setFormData({ note: e.target.value })}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '16px',
                                fontSize: '1rem',
                                bgcolor: alpha(theme.palette.primary.main, 0.02),
                                '&.Mui-focused': {
                                    bgcolor: 'transparent',
                                    boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.1)}`
                                }
                            }
                        }}
                    />
                </Box>

                <Box sx={{ mt: 3 }}>
                    <PermissionGuard permission="wastewater:report">
                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            startIcon={<IconCheck size={22} />}
                            onClick={handleSubmit}
                            sx={{
                                borderRadius: '16px',
                                py: 1.5,
                                fontSize: '1.1rem',
                                fontWeight: 700,
                                bgcolor: theme.palette.primary.main,
                                textTransform: 'none',
                                '&:hover': {
                                    bgcolor: theme.palette.primary.dark,
                                    transform: 'translateY(-1px)'
                                }
                            }}
                        >
                            Gửi báo cáo vận hành
                        </Button>
                    </PermissionGuard>
                </Box>
            </Paper>

            {/* History Section */}
            <Paper 
                elevation={0} 
                sx={{ 
                    p: { xs: 2, sm: 3 }, 
                    borderRadius: '24px', 
                    border: '1px solid', 
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
                    <IconHistory size={28} color={theme.palette.secondary.main} />
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>Lịch sử báo cáo</Typography>
                </Stack>

                {loadingHistory ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={32} />
                    </Box>
                ) : (
                    <>
                        <List disablePadding>
                            {history.length > 0 ? (
                                history.map((item, index) => (
                                    <React.Fragment key={item.id || index}>
                                        <ListItem alignItems="flex-start" sx={{ px: 0, py: 1 }}>
                                            <ListItemText
                                                primary={
                                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                                            {dayjs(item.timestamp * 1000).format('DD/MM/YYYY HH:mm')}
                                                        </Typography>
                                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                                            <IconUser size={14} color={theme.palette.text.secondary} />
                                                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                                                {item.user_name}
                                                            </Typography>
                                                        </Stack>
                                                    </Stack>
                                                }
                                                secondary={
                                                    <Typography 
                                                        variant="body2" 
                                                        sx={{ 
                                                            color: 'text.primary', 
                                                            bgcolor: 'grey.50', 
                                                            p: 1.5, 
                                                            borderRadius: 2,
                                                            border: '1px solid',
                                                            borderColor: 'divider',
                                                            whiteSpace: 'pre-wrap'
                                                        }}
                                                    >
                                                        {item.note}
                                                    </Typography>
                                                }
                                            />
                                        </ListItem>
                                        {index < history.length - 1 && <Divider component="li" sx={{ borderStyle: 'dashed' }} />}
                                    </React.Fragment>
                                ))
                            ) : (
                                <Typography align="center" variant="body2" color="text.secondary" sx={{ py: 4 }}>
                                    Chưa có báo cáo nào được ghi nhận.
                                </Typography>
                            )}
                        </List>

                        {total > perPage && (
                            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                                <Pagination 
                                    count={Math.ceil(total / perPage)} 
                                    page={page} 
                                    onChange={handlePageChange} 
                                    color="primary" 
                                    size="small"
                                />
                            </Box>
                        )}
                    </>
                )}
            </Paper>
        </Box>
    );
};

export default WastewaterTreatmentReport;
