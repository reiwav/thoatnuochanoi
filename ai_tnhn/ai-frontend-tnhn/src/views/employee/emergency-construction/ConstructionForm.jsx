import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Box, Typography, Paper, TextField, Button, Slider, FormControlLabel,
    Checkbox, CircularProgress, Stack, Avatar, Card, CardContent, Divider,
    IconButton, List, useMediaQuery, MenuItem
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { IconChevronLeft, IconSend, IconClipboardCheck, IconHistory, IconClock, IconAlertTriangle, IconPlus, IconTrash, IconCamera, IconPhoto, IconArrowLeft, IconMapPin, IconFileText, IconBulb, IconCloudUpload, IconMessageExclamation, IconCar } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import emergencyConstructionApi from 'api/emergencyConstruction';
import MainCard from 'ui-component/cards/MainCard';
import { getInundationImageUrl } from 'utils/imageHelper';
import { InputAdornment } from '@mui/material';

const TabSwitcher = ({ tab, setTab, visibleTabs }) => {
    if (visibleTabs.length <= 1) return null;

    return (
        <Box sx={{ display: 'flex', bgcolor: 'grey.100', borderRadius: 100, p: 0.5, mb: 3 }}>
            {visibleTabs.map((t) => (
                <Box
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    sx={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8,
                        py: 0.9, borderRadius: 100, cursor: 'pointer', transition: 'all .2s',
                        bgcolor: tab === t.id ? 'background.paper' : 'transparent',
                        boxShadow: tab === t.id ? '0 1px 6px rgba(0,0,0,0.12)' : 'none',
                        color: tab === t.id ? 'secondary.main' : 'text.secondary',
                        fontWeight: tab === t.id ? 700 : 500
                    }}
                >
                    {t.icon}
                    <Typography sx={{ fontSize: '1rem', fontWeight: 'inherit', color: 'inherit', lineHeight: 1 }}>{t.label}</Typography>
                </Box>
            ))}
        </Box>
    );
};

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
        <Stack spacing={2.5} sx={{ p: { xs: 2, md: 3 } }}>
            <TextField
                select fullWidth label="Lệnh số" value={order}
                onChange={(e) => setOrder(e.target.value)}
                required
                InputProps={{
                    startAdornment: <InputAdornment position="start"><IconClipboardCheck size={18} color={theme.palette.text.secondary} /></InputAdornment>,
                    sx: { borderRadius: 3 }
                }}
            >
                {[...Array(100)].map((_, i) => (
                    <MenuItem key={i + 1} value={`Lệnh ${i + 1}`}>Lệnh {i + 1}</MenuItem>
                ))}
            </TextField>

            <TextField
                fullWidth label="Vị trí" placeholder="Nhập vị trí..."
                value={location} onChange={(e) => setLocation(e.target.value)} required
                InputProps={{
                    startAdornment: <InputAdornment position="start"><IconMapPin size={18} color={theme.palette.text.secondary} /></InputAdornment>,
                    sx: { borderRadius: 3 }
                }}
            />

            <TextField
                fullWidth multiline rows={3} label="Mô tả chung công việc trong ngày"
                placeholder="Mô tả chi tiết công việc..."
                value={workDone} onChange={(e) => setWorkDone(e.target.value)} required
                InputProps={{
                    startAdornment: <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}><IconFileText size={18} color={theme.palette.text.secondary} /></InputAdornment>,
                    sx: { borderRadius: 3, '& .MuiInputBase-input': { lineHeight: 1.5 } }
                }}
            />

            <Divider />

            <TextField
                fullWidth multiline rows={2} label="Kết luận"
                placeholder="Nhập kết luận..."
                value={conclusion} onChange={(e) => setConclusion(e.target.value)} required
                InputProps={{
                    startAdornment: <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}><IconBulb size={18} color={theme.palette.text.secondary} /></InputAdornment>,
                    sx: { borderRadius: 3 }
                }}
            />

            <TextField
                fullWidth multiline rows={2} label="Ảnh hưởng"
                placeholder="Nhập ảnh hưởng..."
                value={influence} onChange={(e) => setInfluence(e.target.value)}
                InputProps={{
                    startAdornment: <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}><IconCar size={18} color={theme.palette.text.secondary} /></InputAdornment>,
                    sx: { borderRadius: 3 }
                }}
            />

            <TextField
                fullWidth multiline rows={2} label="Bất cập, đề xuất"
                placeholder="Nhập đề xuất..."
                value={proposal} onChange={(e) => setProposal(e.target.value)}
                InputProps={{
                    startAdornment: <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}><IconMessageExclamation size={18} color={theme.palette.text.secondary} /></InputAdornment>,
                    sx: { borderRadius: 3 }
                }}
            />

            <TextField
                fullWidth multiline rows={2} label="Vướng mắc, khó khăn (nếu có)"
                placeholder="Nhập vướng mắc..."
                value={issues} onChange={(e) => setIssues(e.target.value)}
                InputProps={{
                    startAdornment: <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}><IconAlertTriangle size={18} color={theme.palette.text.secondary} /></InputAdornment>,
                    sx: { borderRadius: 3 }
                }}
            />

            <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1, display: 'block' }}>Hình ảnh báo cáo</Typography>
                <Box>
                    <Box component="label" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, border: '2px dashed', borderColor: 'divider', borderRadius: 2, p: 2, cursor: 'pointer', bgcolor: 'grey.50', transition: 'all .2s', '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.lighter' } }}>
                        <input type="file" hidden multiple accept="image/*" onChange={handleImageChange} />
                        <IconCloudUpload size={26} color={theme.palette.primary.main} />
                        <Typography variant="body2" color="text.secondary">Thêm ảnh</Typography>
                    </Box>
                    {imagePreviews.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
                            {imagePreviews.map((preview, idx) => (
                                <Box key={idx} sx={{ position: 'relative', width: 68, height: 68 }}>
                                    <Avatar variant="rounded" src={preview} sx={{ width: '100%', height: '100%', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }} />
                                    <IconButton
                                        size="small" color="error"
                                        onClick={() => removeImage(idx)}
                                        sx={{ position: 'absolute', top: -6, right: -6, bgcolor: 'error.main', color: '#fff', p: 0.3, '&:hover': { bgcolor: 'error.dark' } }}
                                    >
                                        <IconTrash size={11} />
                                    </IconButton>
                                </Box>
                            ))}
                        </Box>
                    )}
                </Box>
            </Box>

            <Button
                fullWidth variant="contained" color="primary" size="large" onClick={handleSubmit} disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <IconSend size={20} />}
                sx={{ borderRadius: 100, py: 1.5, fontWeight: 700, mt: 1 }}
            >
                Gửi Báo Cáo
            </Button>
        </Stack>
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

    const renderContent = () => (
        <Box sx={{ width: '100%' }}>
            <TabSwitcher
                tab={tabValue}
                setTab={setTabValue}
                visibleTabs={[
                    { id: 0, label: 'Báo cáo', icon: <IconClipboardCheck size={18} /> },
                    { id: 1, label: 'Lịch sử', icon: <IconHistory size={18} /> }
                ]}
            />
            {tabValue === 0 ? renderForm() : renderHistory()}
        </Box>
    );

    if (isMobile) {
        return (
            <Box sx={{ px: 2, pt: 2, pb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <IconButton size="small" onClick={() => navigate(-1)}>
                        <IconArrowLeft size={20} />
                    </IconButton>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {constructionName}
                    </Typography>
                </Box>
                {renderContent()}
            </Box>
        );
    }

    return (
        <MainCard
            title={constructionName}
            secondary={<Button variant="outlined" size="small" startIcon={<IconArrowLeft size={16} />} onClick={() => navigate(-1)}>Quay lại</Button>}
        >
            <Box sx={{ maxWidth: 640, mx: 'auto' }}>{renderContent()}</Box>
        </MainCard>
    );
};

export default ConstructionForm;
