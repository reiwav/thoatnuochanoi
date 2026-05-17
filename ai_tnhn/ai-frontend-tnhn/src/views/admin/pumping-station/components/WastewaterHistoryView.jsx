import React, { useState, useEffect } from 'react';
import { 
    Box, Stack, IconButton, Typography, CircularProgress, 
    Paper, List, ListItem, ListItemText, Divider, Pagination 
} from '@mui/material';
import { IconArrowLeft } from '@tabler/icons-react';
import dayjs from 'dayjs';
import wastewaterTreatmentApi from 'api/wastewaterTreatment';

const WastewaterHistoryView = ({ station, onBack }) => {
    const [history, setHistory] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const perPage = 10;

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await wastewaterTreatmentApi.getHistory(station.id, { page, per_page: perPage });
            if (res && res.data) {
                setHistory(res.data);
                setTotal(res.total || 0);
            }
        } catch (error) {
            console.error('Failed to fetch history', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [station.id, page]);

    return (
        <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                <IconButton onClick={onBack} size="small" sx={{ bgcolor: 'grey.100' }}>
                    <IconArrowLeft size={20} />
                </IconButton>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 900 }}>{station.name}</Typography>
                    <Typography variant="caption" color="text.secondary">Lịch sử báo cáo vận hành</Typography>
                </Box>
            </Stack>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
            ) : (
                <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden' }}>
                    <List sx={{ p: 0 }}>
                        {history.length > 0 ? (
                            history.map((item, index) => (
                                <React.Fragment key={item.id}>
                                    <ListItem alignItems="flex-start" sx={{ p: 2 }}>
                                        <ListItemText
                                            primary={
                                                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                                        {dayjs(item.timestamp * 1000).format('DD/MM/YYYY HH:mm')}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{item.user_name}</Typography>
                                                </Stack>
                                            }
                                            secondary={
                                                <Typography 
                                                    variant="body2" 
                                                    sx={{ bgcolor: 'grey.50', p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', fontStyle: 'italic' }}
                                                >
                                                    {item.note}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                    {index < history.length - 1 && <Divider />}
                                </React.Fragment>
                            ))
                        ) : (
                            <Box sx={{ py: 5, textAlign: 'center' }}><Typography color="text.secondary">Chưa có dữ liệu lịch sử</Typography></Box>
                        )}
                    </List>
                </Paper>
            )}

            {total > perPage && (
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                    <Pagination 
                        count={Math.ceil(total / perPage)} 
                        page={page} 
                        onChange={(e, v) => setPage(v)} 
                        color="primary"
                    />
                </Box>
            )}
        </Box>
    );
};

export default WastewaterHistoryView;
