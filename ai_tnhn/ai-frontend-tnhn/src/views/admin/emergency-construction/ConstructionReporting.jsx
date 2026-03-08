import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box, Typography, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow,
    Button, CircularProgress, Chip,
    Stack, Tab, Tabs, Tooltip, useMediaQuery, Card, CardContent, Divider,
    Avatar, List, ListItem, ListItemIcon, ListItemText, TextField, IconButton
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconClipboardCheck, IconHistory, IconChevronRight, IconUser, IconLogout, IconSearch, IconX } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import emergencyConstructionApi from 'api/emergencyConstruction';
import authApi from 'api/auth';
import MainCard from 'ui-component/cards/MainCard';

const ConstructionReporting = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate();
    const { search } = useLocation();

    // Read activeTab from URL query (for mobile bottom nav)
    const params = new URLSearchParams(search);
    const activeTab = parseInt(params.get('activeTab') || '0');

    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [constructions, setConstructions] = useState([]);
    const [history, setHistory] = useState([]);
    const [userOrgId, setUserOrgId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const userRole = localStorage.getItem('role') || 'employee';
    const basePath = userRole === 'employee' ? '/company' : '/admin';

    const fetchProfile = async () => {
        try {
            const res = await authApi.getProfile();
            if (res.data?.status === 'success') {
                setUserOrgId(res.data.data?.org_id || '');
            }
        } catch (err) {
            console.error('Lỗi tải profile:', err);
        }
    };

    const loadConstructions = async () => {
        if (!userOrgId) return;
        setLoading(true);
        try {
            const res = await emergencyConstructionApi.getAll({ org_id: userOrgId, per_page: 100 });
            if (res.data?.status === 'success') {
                setConstructions(res.data.data?.data || []);
            }
        } catch (err) {
            toast.error('Lỗi tải danh sách công trình');
        } finally {
            setLoading(false);
        }
    };

    const loadAllHistory = async () => {
        if (!userOrgId) return;
        setHistoryLoading(true);
        try {
            // Ideally we need a GET /api/admin/emergency-constructions/reports/all
            // Since we don't have it, we might need a workaround or adapt an existing API.
            // For now, let's assume we can fetch history for all constructions mapping over them.
            // This is a temporary limitation. In a real app we'd add a dedicated endpoint.
            const allHistory = [];
            for (const c of constructions) {
                const res = await emergencyConstructionApi.getProgressHistory(c.id);
                if (res.data?.status === 'success' && res.data.data) {
                    allHistory.push(...res.data.data.map(h => ({ ...h, construction_name: c.name })));
                }
            }
            // Sort by report_date descending
            allHistory.sort((a, b) => b.report_date - a.report_date);
            setHistory(allHistory);
        } catch (err) {
            console.error('Lỗi tải lịch sử chung', err);
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    useEffect(() => {
        if (userOrgId) loadConstructions();
    }, [userOrgId]);

    useEffect(() => {
        if (activeTab === 2 && constructions.length > 0) {
            loadAllHistory();
        }
    }, [activeTab, constructions]);

    const getStatusChip = (status) => {
        const config = {
            planned: { label: 'Dự kiến', color: 'default' },
            ongoing: { label: 'Đang thi công', color: 'warning' },
            completed: { label: 'Hoàn thành', color: 'success' },
            suspended: { label: 'Tạm dừng', color: 'error' }
        };
        const s = config[status] || config.planned;
        return <Chip label={s.label} color={s.color} size="small" variant="outlined" sx={{ fontWeight: 600 }} />;
    };

    const filteredConstructions = useMemo(() => {
        let result = activeTab === 1 ? constructions.filter(c => c.status !== 'completed') : constructions;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(c => c.name?.toLowerCase().includes(q) || c.location?.toLowerCase().includes(q));
        }
        return result;
    }, [constructions, activeTab, searchQuery]);

    const stats = useMemo(() => {
        const total = constructions.length;
        const ongoing = constructions.filter(c => c.status !== 'completed').length;
        return { total, ongoing };
    }, [constructions]);

    const handleCardClick = (row) => {
        navigate(`${basePath}/emergency-construction/form?id=${row.id}&name=${encodeURIComponent(row.name)}`);
    };

    const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('role'); navigate('/pages/login'); };

    // --- Tab 3: Account ---
    if (activeTab === 3) {
        return (
            <Box sx={{ px: 2, pt: 4, textAlign: 'center' }}>
                <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}>
                    <IconUser size={40} />
                </Avatar>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Cán bộ công trình</Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 4 }}>Phòng Thoát Nước Hà Nội</Typography>

                <List sx={{ bgcolor: 'background.paper', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', mb: 4 }}>
                    <ListItem button onClick={() => toast.success('Tính năng đang phát triển')}>
                        <ListItemIcon><IconUser size={20} color={theme.palette.primary.main} /></ListItemIcon>
                        <ListItemText primary="Thông tin cá nhân" />
                        <IconChevronRight size={20} style={{ color: theme.palette.text.disabled }} />
                    </ListItem>
                    <Divider variant="middle" />
                    <ListItem button onClick={handleLogout} sx={{ color: 'error.main' }}>
                        <ListItemIcon><IconLogout size={20} color={theme.palette.error.main} /></ListItemIcon>
                        <ListItemText primary="Đăng xuất" />
                        <IconChevronRight size={20} style={{ color: theme.palette.text.disabled }} />
                    </ListItem>
                </List>
            </Box>
        );
    }

    // --- Tab 2: Global History ---
    if (activeTab === 2) {
        return (
            <Box sx={{ px: 2, pt: 2, pb: 6 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>Lịch sử báo cáo công trình</Typography>
                {historyLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                ) : history.length === 0 ? (
                    <Typography color="textSecondary" align="center" sx={{ py: 4, fontStyle: 'italic' }}>Chưa có báo cáo nào được ghi nhận.</Typography>
                ) : (
                    <List sx={{ p: 0 }}>
                        {history.map((h, idx) => (
                            <Card key={idx} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', mb: 2 }}>
                                <CardContent sx={{ p: '16px !important' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="subtitle2" fontWeight={800} color="primary">{h.construction_name}</Typography>
                                        <Typography variant="h6" fontWeight={800} color="secondary.main">{h.progress_percentage}%</Typography>
                                    </Box>
                                    <Typography variant="caption" color="textSecondary" sx={{ mb: 1.5, display: 'block' }}>
                                        {new Date(h.report_date * 1000).toLocaleString('vi-VN')}
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.5 }}>{h.work_done}</Typography>

                                    {h.tasks && h.tasks.length > 0 && (
                                        <Box sx={{ mb: 1.5 }}>
                                            {h.tasks.map((t, tidx) => (
                                                <Box key={tidx} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, p: 1, bgcolor: 'primary.lighter', borderRadius: 1 }}>
                                                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.dark' }}>• {t.name}</Typography>
                                                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main' }}>{t.percentage}%</Typography>
                                                </Box>
                                            ))}
                                        </Box>
                                    )}
                                    {h.issues && (
                                        <Box sx={{ p: 1, bgcolor: 'error.lighter', borderRadius: 1.5, mb: 1.5 }}>
                                            <Typography variant="caption" color="error.dark" display="block" fontWeight={700}>Vướng mắc:</Typography>
                                            <Typography variant="caption" color="error.dark">{h.issues}</Typography>
                                        </Box>
                                    )}
                                    <Divider sx={{ mb: 1.5 }} />
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Typography variant="caption" fontWeight={700}>{h.reporter_name?.charAt(0)}</Typography>
                                        </Box>
                                        <Typography variant="caption" fontWeight={700}>{h.reporter_name}</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        ))}
                    </List>
                )}
            </Box>
        );
    }

    // --- Tab 0 & 1: Dashboard (All & Ongoing) ---
    return (
        <Box sx={{ px: isMobile ? 2 : 0, pt: isMobile ? 2 : 0 }}>
            {/* Header */}
            {isMobile ? (
                <Box sx={{ mb: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main', mb: 1.5 }}>Công trình khẩn</Typography>
                    <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                        <Chip label={`Tất cả (${stats.total})`} size="small" variant={activeTab === 0 ? 'filled' : 'outlined'} color="primary" onClick={() => navigate(`${basePath}/emergency-construction/dashboard`)} sx={{ fontWeight: 700, height: 26, fontSize: '0.72rem', cursor: 'pointer' }} />
                        <Chip label={`Chưa xong (${stats.ongoing})`} size="small" color="warning" variant={activeTab === 1 ? 'filled' : 'outlined'} onClick={() => navigate(`${basePath}/emergency-construction/dashboard?activeTab=1`)} sx={{ fontWeight: 700, height: 26, fontSize: '0.72rem', cursor: 'pointer' }} />
                    </Stack>
                    <TextField
                        fullWidth size="small" placeholder="Tìm kiếm công trình..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{ mb: 2, bgcolor: 'background.paper', borderRadius: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        InputProps={{
                            startAdornment: <IconSearch size={16} sx={{ color: 'text.disabled', mr: 1, fontSize: '1.1rem' }} />,
                            endAdornment: searchQuery ? <IconButton size="small" onClick={() => setSearchQuery('')}><IconX size={16} /></IconButton> : null
                        }}
                    />
                </Box>
            ) : (
                <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.dark', mb: 1.5 }}>Quản lý thi công khẩn cấp</Typography>
                        <Stack direction="row" spacing={1.5}>
                            <Chip label={`Tất cả (${stats.total})`} size="small" variant={activeTab === 0 ? 'filled' : 'outlined'} color="primary" onClick={() => navigate(`${basePath}/emergency-construction/dashboard`)} sx={{ fontWeight: 700, px: 1, cursor: 'pointer' }} />
                            <Chip label={`Chưa xong (${stats.ongoing})`} size="small" color="warning" variant={activeTab === 1 ? 'filled' : 'outlined'} onClick={() => navigate(`${basePath}/emergency-construction/dashboard?activeTab=1`)} sx={{ fontWeight: 700, px: 1, cursor: 'pointer' }} />
                        </Stack>
                    </Box>
                    <Box sx={{ width: 350 }}>
                        <TextField
                            fullWidth size="small" placeholder="Tìm kiếm công trình..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            sx={{ bgcolor: 'background.paper', borderRadius: 2, '& .MuiOutlinedInput-root': { borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' } }}
                            InputProps={{
                                startAdornment: <IconSearch size={16} sx={{ color: 'text.disabled', mr: 1, fontSize: '1.1rem' }} />,
                                endAdornment: searchQuery ? <IconButton size="small" onClick={() => setSearchQuery('')}><IconX size={16} /></IconButton> : null
                            }}
                        />
                    </Box>
                </Box>
            )}

            {/* List */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress size={30} color="secondary" /></Box>
            ) : filteredConstructions.length === 0 ? (
                <Typography align="center" sx={{ py: 3, color: 'text.secondary' }}>Không có công trình nào phù hợp</Typography>
            ) : isMobile ? (
                <Stack spacing={2}>
                    {filteredConstructions.map((row) => (
                        <Card key={row.id} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', cursor: 'pointer', transition: 'all .2s', '&:hover': { borderColor: 'primary.main' } }} onClick={() => handleCardClick(row)}>
                            <CardContent sx={{ p: '16px !important' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'flex-start' }}>
                                    <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.3, pr: 1 }}>{row.name}</Typography>
                                    {getStatusChip(row.status)}
                                </Box>
                                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>📍 {row.location}</Typography>
                                <Typography variant="caption" display="block" color="textSecondary" sx={{ mb: 2 }}>📅 Dự kiến: {new Date(row.end_date * 1000).toLocaleDateString('vi-VN')}</Typography>
                                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, display: 'flex', alignItems: 'center' }}>Chạm để báo cáo / xem lịch sử <IconChevronRight size={14} /></Typography>
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            ) : (
                <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
                    <Table sx={{ minWidth: 700 }}>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', py: 2 }}>Tên công trình</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', py: 2 }}>Vị trí</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', py: 2 }}>Thời gian dự kiến</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', py: 2 }}>Trạng thái</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', py: 2 }}>Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredConstructions.map((row) => (
                                <TableRow key={row.id} hover onClick={() => handleCardClick(row)} sx={{ cursor: 'pointer', transition: 'background-color 0.2s', '&:hover': { bgcolor: 'primary.lighter' } }}>
                                    <TableCell>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.dark' }}>{row.name}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            📍 {row.location}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={new Date(row.end_date * 1000).toLocaleDateString('vi-VN')} size="small" variant="outlined" sx={{ bgcolor: 'background.paper' }} />
                                    </TableCell>
                                    <TableCell>{getStatusChip(row.status)}</TableCell>
                                    <TableCell align="right">
                                        <Button size="small" variant="contained" color="secondary" endIcon={<IconChevronRight size={16} />} sx={{ borderRadius: '8px', boxShadow: 'none', fontWeight: 700, px: 2, bgcolor: 'secondary.light', color: 'secondary.dark', '&:hover': { bgcolor: 'secondary.main', color: '#fff' } }}>
                                            Chi tiết
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

export default ConstructionReporting;
