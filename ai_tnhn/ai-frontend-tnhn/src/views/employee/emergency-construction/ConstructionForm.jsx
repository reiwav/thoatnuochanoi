import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Box, Typography, Paper, TextField, Button, Slider, FormControlLabel,
    Checkbox, CircularProgress, Stack, Avatar, Card, CardContent, Divider,
    Tabs, Tab, IconButton, List, useMediaQuery, MenuItem
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { IconChevronLeft, IconSend, IconClipboardCheck, IconHistory, IconClock, IconAlertTriangle, IconPlus, IconTrash, IconCamera, IconPhoto } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import emergencyConstructionApi from 'api/emergencyConstruction';
import MainCard from 'ui-component/cards/MainCard';
import { getInundationImageUrl } from 'utils/imageHelper';

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
    const [issues, setIssues] = useState('');
    const [order, setOrder] = useState('');
    const [location, setLocation] = useState('');
    const [conclusion, setConclusion] = useState('');
    const [influence, setInfluence] = useState('');
    const [proposal, setProposal] = useState('');
    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);

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

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        setImages([...images, ...files]);

        const newPreviews = files.map(file => URL.createObjectURL(file));
        setImagePreviews([...imagePreviews, ...newPreviews]);
    };

    const removeImage = (index) => {
        const newImages = [...images];
        newImages.splice(index, 1);
        setImages(newImages);

        const newPreviews = [...imagePreviews];
        URL.revokeObjectURL(newPreviews[index]);
        newPreviews.splice(index, 1);
        setImagePreviews(newPreviews);
    };

    const handleSubmit = async () => {
        if (!workDone.trim()) { toast.error('Vui lòng nhập nội dung công việc báo cáo'); return; }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('construction_id', constructionId);
            formData.append('work_done', workDone);
            formData.append('tasks', JSON.stringify([]));
            formData.append('progress_percentage', 0);
            formData.append('issues', issues);
            formData.append('order', order);
            formData.append('location', location);
            formData.append('conclusion', conclusion);
            formData.append('influence', influence);
            formData.append('proposal', proposal);
            formData.append('expected_completion_date', 0);

            images.forEach((image) => {
                formData.append('images', image);
            });

            const res = await emergencyConstructionApi.createProgress(formData);
            if (res.data) {
                toast.success('Báo cáo tiến độ thành công');
                // Reset form
                setWorkDone('');
                setIssues('');
                setOrder('');
                setLocation('');
                setConclusion('');
                setInfluence('');
                setProposal('');
                setImages([]);
                setImagePreviews([]);
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
            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>Lệnh số <span style={{ color: 'red' }}>*</span></Typography>
                <TextField
                    select fullWidth value={order} onChange={(e) => setOrder(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                >
                    {[...Array(100)].map((_, i) => (
                        <MenuItem key={i + 1} value={`Lệnh ${i + 1}`}>Lệnh {i + 1}</MenuItem>
                    ))}
                </TextField>
            </Box>

            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>Vị trí <span style={{ color: 'red' }}>*</span></Typography>
            <TextField
                fullWidth placeholder="Nhập vị trí..."
                value={location} onChange={(e) => setLocation(e.target.value)}
                sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

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

            <Divider sx={{ mb: 3 }} />

            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>Kết luận <span style={{ color: 'red' }}>*</span></Typography>
            <TextField
                fullWidth multiline rows={2} placeholder="Nhập kết luận..."
                value={conclusion} onChange={(e) => setConclusion(e.target.value)}
                sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>Ảnh hưởng</Typography>
            <TextField
                fullWidth multiline rows={2} placeholder="Nhập ảnh hưởng..."
                value={influence} onChange={(e) => setInfluence(e.target.value)}
                sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>Bất cập, đề xuất</Typography>
            <TextField
                fullWidth multiline rows={2} placeholder="Nhập đề xuất..."
                value={proposal} onChange={(e) => setProposal(e.target.value)}
                sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>Vướng mắc, khó khăn (nếu có)</Typography>
            <TextField
                fullWidth multiline rows={2} placeholder="Nhập vướng mắc..."
                value={issues} onChange={(e) => setIssues(e.target.value)}
                sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700 }}>Hình ảnh báo cáo</Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                    {imagePreviews.map((preview, idx) => (
                        <Box key={idx} sx={{ position: 'relative', width: 80, height: 80 }}>
                            <Avatar variant="rounded" src={preview} sx={{ width: 80, height: 80 }} />
                            <IconButton
                                size="small" color="error"
                                onClick={() => removeImage(idx)}
                                sx={{ position: 'absolute', top: -5, right: -5, bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'grey.100' } }}
                            >
                                <IconTrash size={14} />
                            </IconButton>
                        </Box>
                    ))}
                    <Button
                        component="label" variant="outlined"
                        sx={{ width: 80, height: 80, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 0.5, borderColor: 'divider', color: 'text.secondary' }}
                    >
                        <input type="file" hidden multiple accept="image/*" onChange={handleImageChange} />
                        <IconCamera size={24} />
                        <Typography variant="caption" fontWeight={700}>Thêm ảnh</Typography>
                    </Button>
                </Box>
            </Box>

            {/* Removed Expected Date Picker */}

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
                                </Box>
                                {h.order && <Typography variant="h6" color="secondary" fontWeight={800} sx={{ mb: 1 }}>{h.order}</Typography>}
                                {h.location && <Typography variant="body2" color="textSecondary" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}><IconAlertTriangle size={16} /> {h.location}</Typography>}
                                {h.work_done && <Box sx={{ mb: 2 }}><Typography variant="subtitle2" color="textSecondary" fontWeight={700}>Công việc thực hiện:</Typography><Typography variant="body1" sx={{ lineHeight: 1.6, fontWeight: 500 }}>{h.work_done}</Typography></Box>}

                                {/* Removed tasks summary */}

                                {h.conclusion && <Box sx={{ mb: 1.5 }}><Typography variant="subtitle2" color="primary" fontWeight={700}>Kết luận:</Typography><Typography variant="body2">{h.conclusion}</Typography></Box>}
                                {h.influence && <Box sx={{ mb: 1.5 }}><Typography variant="subtitle2" color="textSecondary" fontWeight={700}>Ảnh hưởng:</Typography><Typography variant="body2">{h.influence}</Typography></Box>}
                                {h.proposal && <Box sx={{ mb: 1.5 }}><Typography variant="subtitle2" color="textSecondary" fontWeight={700}>Đề xuất:</Typography><Typography variant="body2">{h.proposal}</Typography></Box>}

                                {h.issues && (
                                    <Box sx={{ p: 1, bgcolor: 'error.lighter', borderRadius: 1.5, mb: 1.5 }}>
                                        <Typography variant="body2" color="error.dark" display="block" fontWeight={700}>Vướng mắc:</Typography>
                                        <Typography variant="body2" color="error.dark">{h.issues}</Typography>
                                    </Box>
                                )}

                                {h.images && h.images.length > 0 && (
                                    <Box sx={{ display: 'flex', gap: 1, mb: 2, overflowX: 'auto', pb: 1 }}>
                                        {h.images.map((img, iidx) => (
                                            <Avatar key={iidx} variant="rounded" src={getInundationImageUrl(img)} sx={{ width: 100, height: 100, borderRadius: 2, border: '1px solid', borderColor: 'divider' }} />
                                        ))}
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
