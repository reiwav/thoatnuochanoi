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
    const [workDone, setWorkDone] = useState('');
    const [tasks, setTasks] = useState([]);
    const [progress, setProgress] = useState(0);
    const [issues, setIssues] = useState('');
    const [expectedDate, setExpectedDate] = useState(null);

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
            const res = await emergencyConstructionApi.getProgressHistory(constructionId);
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
        if (!workDone.trim() && tasks.length === 0) { toast.error('Vui lòng nhập nội dung công việc hoặc thêm đầu việc'); return; }
        if (tasks.some(t => !t.name.trim())) { toast.error('Vui lòng nhập tên cho tất cả đầu việc con'); return; }
        if (progress > 0 && !expectedDate) {
            toast.error('Vui lòng chọn ngày dự kiến hoàn thành'); return;
        }

        setLoading(true);
        try {
            const payload = {
                construction_id: constructionId,
                work_done: workDone,
                tasks: tasks.map(t => ({ name: t.name, percentage: parseInt(t.percentage) || 0 })),
                progress_percentage: progress,
                issues: issues,
                is_completed: false, // Legacy field, keeping false
                expected_completion_date: expectedDate ? expectedDate.unix() : 0
            };

            const res = await emergencyConstructionApi.createProgress(payload);
            if (res.data) {
                toast.success('Báo cáo tiến độ thành công');
                // Reset form
                setWorkDone('');
                setTasks([]);
                setProgress(0);
                setIssues('');
                setExpectedDate(null);
                // Switch to history tab to view the new report
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
            <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700 }}>Mô tả chung công việc trong ngày <span style={{ color: 'red' }}>*</span></Typography>
            <TextField
                fullWidth multiline rows={3} placeholder="Mô tả chi tiết công việc..."
                value={workDone} onChange={(e) => setWorkDone(e.target.value)}
                sx={{
                    mb: 3,
                    '& .MuiInputBase-input': { fontSize: '1.05rem', lineHeight: 1.5 },
                    '& .MuiOutlinedInput-root': { borderRadius: 2 }
                }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Các đầu việc chi tiết</Typography>
                <Button size="medium" variant="outlined" startIcon={<IconPlus size={18} />} onClick={() => setTasks([...tasks, { name: '', percentage: 0 }])} sx={{ borderRadius: 2, fontWeight: 700 }}>
                    Thêm đầu việc
                </Button>
            </Box>

            {tasks.map((task, index) => (
                <Card key={index} variant="outlined" sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                        <TextField
                            fullWidth placeholder={`Tên đầu việc ${index + 1}...`}
                            value={task.name} onChange={(e) => { const newTasks = [...tasks]; newTasks[index].name = e.target.value; setTasks(newTasks); }}
                            sx={{ '& .MuiInputBase-input': { fontSize: '1rem', fontWeight: 600 } }}
                        />
                        <IconButton color="error" size="medium" onClick={() => { const newTasks = [...tasks]; newTasks.splice(index, 1); setTasks(newTasks); }}>
                            <IconTrash size={22} />
                        </IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>Tiến độ ({task.percentage}%)</Typography>
                        <Box sx={{ width: '60%' }}>
                            <Slider
                                value={task.percentage} onChange={(e, val) => { const newTasks = [...tasks]; newTasks[index].percentage = val; setTasks(newTasks); }}
                                step={10} marks min={0} max={100} valueLabelDisplay="auto" size="small"
                            />
                        </Box>
                    </Box>
                </Card>
            ))}

            <Divider sx={{ mb: 3, mt: tasks.length > 0 ? 1 : 0 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Tiến độ tổng của toàn dự án (%)</Typography>
                <Typography variant="h6" color="primary" fontWeight={800}>{progress}%</Typography>
            </Box>
            <Slider
                value={progress} onChange={(e, val) => setProgress(val)}
                valueLabelDisplay="auto" step={5} marks min={0} max={100}
                sx={{ mb: 3 }}
            />

            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>Vướng mắc, khó khăn (nếu có)</Typography>
            <TextField
                fullWidth multiline rows={2} placeholder="Nhập khó khăn..."
                value={issues} onChange={(e) => setIssues(e.target.value)}
                sx={{
                    mb: 4,
                    '& .MuiInputBase-input': { fontSize: '1rem' }
                }}
            />

            <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700 }}>Ngày dự kiến hoàn thành <span style={{ color: 'red' }}>*</span></Typography>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
                    <DatePicker
                        value={expectedDate} onChange={(newDate) => setExpectedDate(newDate)}
                        format="DD/MM/YYYY" slotProps={{
                            textField: {
                                fullWidth: true,
                                sx: { '& .MuiInputBase-input': { fontSize: '1.1rem', fontWeight: 600 } }
                            }
                        }}
                    />
                </LocalizationProvider>
            </Box>

            <Button
                fullWidth variant="contained" color="primary" size="large" onClick={handleSubmit} disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <IconSend size={20} />}
                sx={{ borderRadius: 2, fontWeight: 700, py: 1.5 }}
            >
                Gửi Báo Cáo
            </Button>
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
                                    <Typography variant="h4" fontWeight={900} color="secondary.main">{h.progress_percentage}%</Typography>
                                </Box>
                                {h.work_done && <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6, fontWeight: 500 }}>{h.work_done}</Typography>}

                                {h.tasks && h.tasks.length > 0 && (
                                    <Box sx={{ mb: 2 }}>
                                        {h.tasks.map((t, tidx) => (
                                            <Box key={tidx} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, p: 1.5, bgcolor: 'primary.lighter', borderRadius: 2 }}>
                                                <Typography variant="body1" sx={{ fontWeight: 700, color: 'primary.dark' }}>• {t.name}</Typography>
                                                <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>{t.percentage}%</Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                )}

                                {h.issues && (
                                    <Box sx={{ p: 1, bgcolor: 'error.lighter', borderRadius: 1.5, mb: 1.5 }}>
                                        <Typography variant="body2" color="error.dark" display="block" fontWeight={700}>Vướng mắc:</Typography>
                                        <Typography variant="body2" color="error.dark">{h.issues}</Typography>
                                    </Box>
                                )}
                                <Divider sx={{ mb: 1.5 }} />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Typography variant="caption" fontWeight={700}>{h.reporter_name?.charAt(0)}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" display="block" fontWeight={700}>{h.reporter_name}</Typography>
                                        <Typography variant="body2" color="textSecondary">{h.reporter_email}</Typography>
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
