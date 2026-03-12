import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Box, Typography, Paper, TextField, Button, Slider, FormControlLabel,
    Checkbox, CircularProgress, Stack, Avatar, Card, CardContent, Divider,
    Tabs, Tab, IconButton, List, useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { IconChevronLeft, IconSend, IconClipboardCheck, IconHistory, IconClock, IconAlertTriangle, IconPlus, IconTrash } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import emergencyConstructionApi from 'api/emergencyConstruction';
import MainCard from 'ui-component/cards/MainCard';

function CustomTabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} id={`simple-tabpanel-${index}`} aria-labelledby={`simple-tab-${index}`} {...other} style={{ flex: 1, overflowY: 'auto' }}>
            {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
        </div>
    );
}

const ConstructionForm = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const constructionId = searchParams.get('id');
    const constructionName = searchParams.get('name') || 'Chi tiết công trình';
    const initialTab = parseInt(searchParams.get('tab') || '0');

    const [tabValue, setTabValue] = useState(initialTab);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);

    // Form states
    const [command, setCommand] = useState('Lệnh 1');
    const [location, setLocation] = useState('');
    const [conclusion, setConclusion] = useState('');
    const [impact, setImpact] = useState('');
    const [proposal, setProposal] = useState('');

    const userRole = localStorage.getItem('role') || 'employee';
    const basePath = userRole === 'employee' ? '/company' : '/admin';

    useEffect(() => {
        if (!constructionId) {
            navigate(`${basePath}/emergency-construction/dashboard`);
            return;
        }
        if (tabValue === 1) {
            loadHistory();
        }
    }, [constructionId, tabValue]);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const res = await emergencyConstructionApi.getSituationHistory(constructionId);
            if (res.data?.status === 'success') {
                const data = res.data.data || [];
                // Sort descending by date
                data.sort((a, b) => b.report_date - a.report_date);
                setHistory(data);
            }
        } catch (err) {
            toast.error('Lỗi tải lịch sử');
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const handleSubmit = async () => {
        if (!location.trim()) { toast.error('Vui lòng nhập vị trí'); return; }

        setLoading(true);
        try {
            const payload = {
                construction_id: constructionId,
                command: command,
                location: location,
                conclusion: conclusion,
                impact: impact,
                proposal: proposal
            };

            const res = await emergencyConstructionApi.createSituation(payload);
            if (res.data) {
                toast.success('Báo cáo tình hình thành công');
                // Reset form
                setCommand('Lệnh 1');
                setLocation('');
                setConclusion('');
                setImpact('');
                setProposal('');
                // Switch to history tab
                setTabValue(1);
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Lỗi gửi báo cáo');
        } finally {
            setLoading(false);
        }
    };

    const renderForm = () => (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={3}>
                <TextField
                    fullWidth select label="Lệnh điều hành" required size="small"
                    value={command} onChange={(e) => setCommand(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    SelectProps={{ native: true }}
                >
                    {Array.from({ length: 100 }, (_, i) => `Lệnh ${i + 1}`).map(l => (
                        <option key={l} value={l}>{l}</option>
                    ))}
                </TextField>

                <TextField
                    fullWidth label="Vị trí" placeholder="Nhập vị trí báo cáo..." required size="small"
                    value={location} onChange={(e) => setLocation(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />

                <TextField
                    fullWidth label="Kết luận" placeholder="Nhập kết luận..." multiline rows={2} size="small"
                    value={conclusion} onChange={(e) => setConclusion(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />

                <TextField
                    fullWidth label="Ảnh hưởng" placeholder="Nhập ảnh hưởng..." multiline rows={2} size="small"
                    value={impact} onChange={(e) => setImpact(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />

                <TextField
                    fullWidth label="Đề xuất" placeholder="Nhập đề xuất..." multiline rows={2} size="small"
                    value={proposal} onChange={(e) => setProposal(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />

                <Box>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 700 }}>Hình ảnh / Chụp ảnh</Typography>
                    <Button variant="outlined" component="label" fullWidth sx={{ py: 2, borderStyle: 'dashed', borderRadius: 2 }}>
                        Chọn ảnh từ thư viện hoặc Chụp ảnh
                        <input type="file" hidden multiple accept="image/*" />
                    </Button>
                </Box>

                <Button
                    fullWidth variant="contained" color="primary" size="large" onClick={handleSubmit} disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <IconSend size={20} />}
                    sx={{ borderRadius: 2, fontWeight: 700, py: 1.5, mt: 2 }}
                >
                    Gửi Báo Cáo
                </Button>
            </Stack>
        </Box>
    );

    const renderHistory = () => (
        <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: 'grey.50', minHeight: '100%' }}>
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
            ) : history.length === 0 ? (
                <Typography align="center" color="textSecondary" sx={{ py: 5, fontStyle: 'italic' }}>Chưa có lịch sử báo cáo</Typography>
            ) : (
                <List sx={{ p: 0 }}>
                    {history.map((h, idx) => (
                        <Card key={idx} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', mb: 2 }}>
                            <CardContent sx={{ p: '16px !important' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                                    <Typography variant="body1" fontWeight={700} color="primary">{new Date(h.report_date * 1000).toLocaleString('vi-VN')}</Typography>
                                    <Typography variant="subtitle1" fontWeight={900} color="secondary.main">{h.command}</Typography>
                                </Box>
                                <Typography variant="body2" sx={{ mb: 1, fontWeight: 700 }}>📍 {h.location}</Typography>
                                <Typography variant="body2" sx={{ mb: 0.5 }}><b>Kết luận:</b> {h.conclusion}</Typography>
                                <Typography variant="body2" sx={{ mb: 0.5 }}><b>Ảnh hưởng:</b> {h.impact}</Typography>
                                <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}><b>Đề xuất:</b> {h.proposal}</Typography>

                                <Divider sx={{ mb: 1.5 }} />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Typography variant="caption" fontWeight={700}>{h.reporter_name?.charAt(0)}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" display="block" fontWeight={700}>{h.reporter_name}</Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    ))}
                </List>
            )}
        </Box>
    );

    const content = (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: isMobile ? 'calc(100vh - 56px)' : 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                <IconButton onClick={() => navigate(-1)} sx={{ mr: 1, ml: -1 }}><IconChevronLeft /></IconButton>
                <Typography variant="h4" sx={{ fontWeight: 800, flex: 1 }} noWrap>{constructionName}</Typography>
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
                    <Tab icon={<IconClipboardCheck size={20} />} iconPosition="start" label="Báo cáo" sx={{ fontSize: '0.95rem', fontWeight: 700 }} />
                    <Tab icon={<IconHistory size={20} />} iconPosition="start" label="Lịch sử chi tiết" sx={{ fontSize: '0.95rem', fontWeight: 700 }} />
                </Tabs>
            </Box>

            <CustomTabPanel value={tabValue} index={0}>{renderForm()}</CustomTabPanel>
            <CustomTabPanel value={tabValue} index={1}>{renderHistory()}</CustomTabPanel>
        </Box>
    );

    if (isMobile) {
        return (
            <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'background.paper', zIndex: 1300 }}>
                {content}
            </Box>
        );
    }

    return (
        <MainCard sx={{ height: 'calc(100vh - 120px)', '& .MuiCardContent-root': { p: 0, height: '100%' } }}>
            {content}
        </MainCard>
    );
};

export default ConstructionForm;
