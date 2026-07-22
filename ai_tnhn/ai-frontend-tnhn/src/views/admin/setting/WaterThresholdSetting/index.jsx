import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Card, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
    DialogTitle, Grid, FormControl, InputLabel, Select, MenuItem, Stack, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
    Checkbox, FormControlLabel, FormGroup, Alert, useTheme
} from '@mui/material';
import { IconRipple, IconPlus, IconCheck, IconHistory, IconCircleCheck } from '@tabler/icons-react';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import settingApi from 'api/setting';

const currentYear = new Date().getFullYear();
const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
const allMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const WaterThresholdSetting = () => {
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [activeSetting, setActiveSetting] = useState(null);
    const [settingsList, setSettingsList] = useState([]);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Modal Create state
    const [openCreate, setOpenCreate] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: `Cấu hình ngưỡng mực nước năm ${currentYear}`,
        year: currentYear,
        note: '',
        dryMonths: [1, 2, 3, 4, 11, 12],
        rainyMonths: [5, 6, 7, 8, 9, 10]
    });

    // Modal Confirm Activate state
    const [openActivateConfirm, setOpenActivateConfirm] = useState(false);
    const [targetActivateItem, setTargetActivateItem] = useState(null);
    const [activating, setActivating] = useState(false);

    // Fetch active setting and list
    const fetchData = useCallback(async () => {
        setLoading(true);
        setErrorMsg('');
        try {
            const [activeRes, listRes] = await Promise.all([
                settingApi.getActiveWaterThreshold(selectedYear),
                settingApi.listWaterThresholds({ year: selectedYear })
            ]);
            setActiveSetting(activeRes?.data || activeRes || null);
            setSettingsList(listRes?.data || listRes || []);
        } catch (err) {
            console.error('Error loading water threshold settings:', err);
            setErrorMsg(err?.response?.data?.message || err?.message || 'Không thể tải cấu hình ngưỡng');
        } finally {
            setLoading(false);
        }
    }, [selectedYear]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle Month Toggle in Create Form
    const handleToggleMonth = (season, month) => {
        if (season === 'dry') {
            const isSelected = formData.dryMonths.includes(month);
            const newDry = isSelected
                ? formData.dryMonths.filter((m) => m !== month)
                : [...formData.dryMonths, month];
            // If selecting in dry, remove from rainy
            const newRainy = formData.rainyMonths.filter((m) => m !== month);
            setFormData({ ...formData, dryMonths: newDry, rainyMonths: newRainy });
        } else {
            const isSelected = formData.rainyMonths.includes(month);
            const newRainy = isSelected
                ? formData.rainyMonths.filter((m) => m !== month)
                : [...formData.rainyMonths, month];
            // If selecting in rainy, remove from dry
            const newDry = formData.dryMonths.filter((m) => m !== month);
            setFormData({ ...formData, dryMonths: newDry, rainyMonths: newRainy });
        }
    };

    // Create Setting Handler
    const handleCreateSubmit = async () => {
        if (!formData.name.trim()) {
            setErrorMsg('Vui lòng nhập tên cấu hình');
            return;
        }
        if (formData.dryMonths.length === 0 && formData.rainyMonths.length === 0) {
            setErrorMsg('Vui lòng chọn các tháng cho từng mùa');
            return;
        }

        setSubmitting(true);
        setErrorMsg('');
        try {
            const payload = {
                year: Number(formData.year),
                name: formData.name.trim(),
                note: formData.note.trim(),
                thresholds: [
                    {
                        type: 'mua_kho',
                        name: 'Mùa khô',
                        months: formData.dryMonths.sort((a, b) => a - b)
                    },
                    {
                        type: 'mua_mua',
                        name: 'Mùa mưa',
                        months: formData.rainyMonths.sort((a, b) => a - b)
                    }
                ]
            };

            await settingApi.createWaterThreshold(payload);
            setSuccessMsg('Tạo mới cấu hình thành công (Trạng thái: Mới tạo - New)');
            setOpenCreate(false);
            fetchData();
        } catch (err) {
            setErrorMsg(err?.response?.data?.message || err?.message || 'Không thể tạo mới cấu hình');
        } finally {
            setSubmitting(false);
        }
    };

    // Activate Setting Handler
    const handleConfirmActivate = async () => {
        if (!targetActivateItem) return;
        setActivating(true);
        setErrorMsg('');
        try {
            await settingApi.activateWaterThreshold(targetActivateItem.id || targetActivateItem._id);
            setSuccessMsg(`Đã kích hoạt thành công phiên bản v${targetActivateItem.version}`);
            setOpenActivateConfirm(false);
            setTargetActivateItem(null);
            fetchData();
        } catch (err) {
            setErrorMsg(err?.response?.data?.message || err?.message || 'Không thể kích hoạt cấu hình');
        } finally {
            setActivating(false);
        }
    };

    const getStatusChip = (status) => {
        switch (status) {
            case 'active':
                return <Chip icon={<IconCircleCheck size={16} />} label="Đang áp dụng" color="success" size="small" sx={{ fontWeight: 700 }} />;
            case 'new':
                return <Chip label="Mới tạo (Chờ confirm)" color="warning" size="small" sx={{ fontWeight: 700 }} />;
            case 'archived':
                return <Chip label="Quá khứ" color="default" size="small" sx={{ fontWeight: 600 }} />;
            default:
                return <Chip label={status || 'Không rõ'} size="small" />;
        }
    };

    return (
        <MainCard
            title={
                <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconRipple size={28} color={theme.palette.primary.main} />
                        <Box>
                            <Typography variant="h3" sx={{ fontWeight: 800 }}>Cấu hình Ngưỡng Sông Hồ Theo Mùa</Typography>

                        </Box>
                    </Box>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Năm</InputLabel>
                            <Select
                                value={selectedYear}
                                label="Năm"
                                onChange={(e) => setSelectedYear(e.target.value)}
                            >
                                {yearOptions.map((y) => (
                                    <MenuItem key={y} value={y}>Năm {y}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<IconPlus size={18} />}
                            onClick={() => {
                                setFormData({
                                    name: `Cấu hình mực nước năm ${selectedYear}`,
                                    year: selectedYear,
                                    note: '',
                                    dryMonths: [1, 2, 3, 4, 11, 12],
                                    rainyMonths: [5, 6, 7, 8, 9, 10]
                                });
                                setOpenCreate(true);
                            }}
                            sx={{ fontWeight: 700, borderRadius: '8px', px: 2.5 }}
                        >
                            Tạo cấu hình mới
                        </Button>
                    </Stack>
                </Stack>
            }
        >
            {/* Thông báo Alert Messages */}
            {successMsg && (
                <Alert severity="success" onClose={() => setSuccessMsg('')} sx={{ mb: 2.5, fontWeight: 600 }}>
                    {successMsg}
                </Alert>
            )}
            {errorMsg && (
                <Alert severity="error" onClose={() => setErrorMsg('')} sx={{ mb: 2.5, fontWeight: 600 }}>
                    {errorMsg}
                </Alert>
            )}

            {/* Banner Active Setting Hiện Tại */}
            <Card sx={{ p: 2.5, mb: 3, bgcolor: theme.palette.mode === 'dark' ? '#1a223f' : '#eef2f6', border: '1px solid', borderColor: 'primary.light', borderRadius: '12px' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={7}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <IconCircleCheck size={26} color={theme.palette.success.main} />
                            <Box>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                        {activeSetting ? `Phiên bản v${activeSetting.version}: ${activeSetting.name}` : `Chưa có phiên bản Active cho năm ${selectedYear}`}
                                    </Typography>
                                    {activeSetting && getStatusChip(activeSetting.status)}
                                </Stack>
                                {activeSetting && (
                                    <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                                        Kích hoạt bởi: <strong>{activeSetting.activated_by_name || 'Hệ thống'}</strong>
                                        {activeSetting.activated_time && ` lúc ${new Date(activeSetting.activated_time).toLocaleString('vi-VN')}`}
                                    </Typography>
                                )}
                            </Box>
                        </Stack>
                    </Grid>
                    <Grid item xs={12} md={5}>
                        {activeSetting && activeSetting.thresholds && (
                            <Stack direction="row" spacing={2} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                                {activeSetting.thresholds.map((th, idx) => (
                                    <Box key={idx} sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', minWidth: 140 }}>
                                        <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700 }}>
                                            {th.name} ({th.type === 'mua_kho' ? 'Mùa khô' : 'Mùa mưa'})
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            Các tháng: <strong>{th.months?.join(', ') || 'N/A'}</strong>
                                        </Typography>
                                    </Box>
                                ))}
                            </Stack>
                        )}
                    </Grid>
                </Grid>
            </Card>

            {/* Bảng Danh Sách Các Phiên Bản Cấu Hình */}
            <MainCard
                title={
                    <Stack direction="row" spacing={1} alignItems="center">
                        <IconHistory size={20} />
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>Lịch sử & Phiên bản cấu hình</Typography>
                    </Stack>
                }
                content={false}
            >
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                        <CircularProgress size={32} color="primary" />
                    </Box>
                ) : (
                    <TableContainer>
                        <Table sx={{ minWidth: 700 }}>
                            <TableHead sx={{ bgcolor: theme.palette.mode === 'dark' ? '#111936' : '#f8fafc' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700 }}>Version</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Tên cấu hình</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Năm</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Phân chia Mùa</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Người tạo</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Ngày tạo</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700 }}>Thao tác</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {settingsList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                            Chưa có phiên bản cấu hình nào cho năm {selectedYear}. Hãy nhấn "Tạo cấu hình mới".
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    settingsList.map((item) => (
                                        <TableRow key={item.id || item._id} hover>
                                            <TableCell>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>v{item.version}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body1" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                                                {item.note && <Typography variant="caption" color="textSecondary" display="block">{item.note}</Typography>}
                                            </TableCell>
                                            <TableCell>{item.year}</TableCell>
                                            <TableCell>
                                                {item.thresholds?.map((th, idx) => (
                                                    <Typography key={idx} variant="caption" display="block" color="textSecondary">
                                                        • <strong>{th.name}:</strong> T{th.months?.join(', T')}
                                                    </Typography>
                                                ))}
                                            </TableCell>
                                            <TableCell>{getStatusChip(item.status)}</TableCell>
                                            <TableCell>{item.created_by_name || 'System'}</TableCell>
                                            <TableCell>
                                                {item.created_at ? new Date(item.created_at * 1000).toLocaleDateString('vi-VN') : 'N/A'}
                                            </TableCell>
                                            <TableCell align="center">
                                                {item.status === 'new' ? (
                                                    <Button
                                                        variant="contained"
                                                        color="success"
                                                        size="small"
                                                        startIcon={<IconCheck size={16} />}
                                                        onClick={() => {
                                                            setTargetActivateItem(item);
                                                            setOpenActivateConfirm(true);
                                                        }}
                                                        sx={{ fontWeight: 700, borderRadius: '6px', whiteSpace: 'nowrap' }}
                                                    >
                                                        Kích hoạt (Enable Active)
                                                    </Button>
                                                ) : item.status === 'active' ? (
                                                    <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700 }}>✓ Đang hoạt động</Typography>
                                                ) : (
                                                    <Typography variant="caption" color="textSecondary">Lịch sử quá khứ</Typography>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </MainCard>

            {/* Modal Dialog Tạo Mới Cấu Hình */}
            <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ fontWeight: 800, fontSize: '1.25rem' }}>
                    Tạo phiên bản cấu hình mùa & tháng mới
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2.5}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={8}>
                                <TextField
                                    fullWidth
                                    label="Tên cấu hình phiên bản"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Năm áp dụng"
                                    value={formData.year}
                                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                />
                            </Grid>
                        </Grid>

                        <TextField
                            fullWidth
                            multiline
                            rows={2}
                            label="Ghi chú (Tùy chọn)"
                            value={formData.note}
                            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                        />

                        {/* Phân chia tháng cho Mùa Khô & Mùa Mưa */}
                        <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}>
                            <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
                                🌵 Mùa khô (mua_kho) - Chọn các tháng thuộc mùa khô:
                            </Typography>
                            <FormGroup row>
                                {allMonths.map((m) => (
                                    <FormControlLabel
                                        key={`dry_${m}`}
                                        control={
                                            <Checkbox
                                                checked={formData.dryMonths.includes(m)}
                                                onChange={() => handleToggleMonth('dry', m)}
                                                color="warning"
                                            />
                                        }
                                        label={`Tháng ${m}`}
                                        sx={{ minWidth: '90px' }}
                                    />
                                ))}
                            </FormGroup>
                        </Box>

                        <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}>
                            <Typography variant="subtitle1" color="info.main" sx={{ fontWeight: 700, mb: 1 }}>
                                🌧️ Mùa mưa (mua_mua) - Chọn các tháng thuộc mùa mưa:
                            </Typography>
                            <FormGroup row>
                                {allMonths.map((m) => (
                                    <FormControlLabel
                                        key={`rainy_${m}`}
                                        control={
                                            <Checkbox
                                                checked={formData.rainyMonths.includes(m)}
                                                onChange={() => handleToggleMonth('rainy', m)}
                                                color="primary"
                                            />
                                        }
                                        label={`Tháng ${m}`}
                                        sx={{ minWidth: '90px' }}
                                    />
                                ))}
                            </FormGroup>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setOpenCreate(false)} disabled={submitting}>Hủy</Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleCreateSubmit}
                        disabled={submitting}
                        startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <IconPlus size={18} />}
                        sx={{ fontWeight: 700 }}
                    >
                        {submitting ? 'Đang tạo...' : 'Tạo mới (Lưu nháp Status: New)'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirm Dialog Kích Hoạt (Activate) */}
            <Dialog open={openActivateConfirm} onClose={() => setOpenActivateConfirm(false)}>
                <DialogTitle sx={{ fontWeight: 800 }}>
                    Xác nhận kích hoạt phiên bản v{targetActivateItem?.version}?
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1">
                        Khi kích hoạt phiên bản <strong>"{targetActivateItem?.name}"</strong>:
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                        • Cấu hình này sẽ chuyển sang trạng thái <strong>Active</strong>.<br />
                        • Phiên bản active cũ sẽ tự động lưu vào <strong>Archived (Lịch sử)</strong>.<br />
                        • Toàn bộ hệ thống sẽ tự động cập nhật và áp dụng quy tắc tính ngưỡng mới ngay lập tức.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setOpenActivateConfirm(false)} disabled={activating}>Hủy</Button>
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleConfirmActivate}
                        disabled={activating}
                        startIcon={activating ? <CircularProgress size={18} color="inherit" /> : <IconCheck size={18} />}
                        sx={{ fontWeight: 700 }}
                    >
                        {activating ? 'Đang kích hoạt...' : 'Xác nhận kích hoạt'}
                    </Button>
                </DialogActions>
            </Dialog>
        </MainCard>
    );
};

export default WaterThresholdSetting;
