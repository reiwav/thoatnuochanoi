import { useState, useEffect } from 'react';
import {
    Button, Grid, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, CircularProgress, Typography, Tooltip, Box, useTheme, Stack, Chip
} from '@mui/material';
import { IconTrash, IconPlus, IconEdit, IconClipboardCheck, IconDeviceFloppy } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import FloodLevelDialog from './FloodLevelDialog';
import settingApi from 'api/setting';

const FloodLevelSetting = () => {
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [floodLevels, setFloodLevels] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState(-1);
    const [editingLevel, setEditingLevel] = useState(null);

    const fetchFloodLevels = async () => {
        setLoading(true);
        try {
            const response = await settingApi.getFloodLevels();
            setFloodLevels(response || []);
        } catch (err) {
            toast.error('Lỗi lấy dữ liệu cấu hình');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFloodLevels();
    }, []);

    const handleOpenCreate = () => {
        setEditingIndex(-1);
        setEditingLevel(null);
        setDialogOpen(true);
    };

    const handleOpenEdit = (level, index) => {
        setEditingIndex(index);
        setEditingLevel(level);
        setDialogOpen(true);
    };

    const handleDelete = (index) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa mức độ này? (Cần bấm Lưu để áp dụng lên máy chủ)')) return;
        const newList = [...floodLevels];
        newList.splice(index, 1);
        setFloodLevels(newList);
    };

    const handleDialogSubmit = (values) => {
        const newList = [...floodLevels];
        if (editingIndex > -1) {
            newList[editingIndex] = values;
        } else {
            newList.push(values);
        }
        setFloodLevels(newList);
        setDialogOpen(false);
    };

    const handleSaveToServer = async () => {
        setSaving(true);
        try {
            await settingApi.updateFloodLevels(floodLevels);
            toast.success('Lưu cấu hình thành công');
        } catch (err) {
            toast.error(err.message || 'Lỗi lưu cấu hình');
        } finally {
            setSaving(false);
        }
    };

    return (
        <MainCard
            title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconClipboardCheck size={24} color={theme.palette.primary.main} />
                    <Typography variant="h3" sx={{ fontWeight: 800 }}>Cấu hình ngưỡng ngập lụt</Typography>
                </Box>
            }
            secondary={
                <Stack direction="row" spacing={2}>
                    <AnimateButton>
                        <Button variant="outlined" color="primary" startIcon={<IconPlus size={18} />} onClick={handleOpenCreate}>
                            Thêm mức độ
                        </Button>
                    </AnimateButton>
                    <AnimateButton>
                        <Button 
                            variant="contained" 
                            color="secondary" 
                            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <IconDeviceFloppy size={18} />} 
                            onClick={handleSaveToServer}
                            disabled={saving}
                        >
                            Lưu cấu hình
                        </Button>
                    </AnimateButton>
                </Stack>
            }
        >
            <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px', overflow: 'hidden' }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 800, py: 2, pl: 3 }}>Mã (Code)</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Tên mức độ</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Ngưỡng (m)</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Màu sắc</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Coi là ngập</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Người cập nhật</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Ngày tạo</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, pr: 3 }}>Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3 }}><CircularProgress size={24} color="secondary" /></TableCell></TableRow>
                        ) : floodLevels.length === 0 ? (
                            <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3 }}>Chưa có cấu hình mức độ ngập nào</TableCell></TableRow>
                        ) : (
                            floodLevels.map((row, index) => (
                                <TableRow key={index} hover>
                                    <TableCell sx={{ fontWeight: 600, pl: 3 }}>
                                        <Chip label={row.code} size="small" variant="outlined" color="primary" sx={{ fontWeight: 700, borderRadius: '8px' }} />
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>{row.name}</TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {row.min_depth}m - {row.max_depth}m
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ width: 24, height: 24, bgcolor: row.color, borderRadius: '4px', border: '1px solid #ddd' }} />
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{row.color}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={row.is_flooding ? 'Đang ngập' : 'Bình thường'} 
                                            color={row.is_flooding ? 'error' : 'success'} 
                                            size="small" 
                                            variant="light"
                                            sx={{ fontWeight: 700 }}
                                        />
                                    </TableCell>
                                    <TableCell>{row.user || '-'}</TableCell>
                                    <TableCell>
                                        {row.ctime ? new Date(row.ctime).toLocaleString('vi-VN') : '-'}
                                    </TableCell>
                                    <TableCell align="right" sx={{ pr: 3 }}>
                                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                            <Tooltip title="Chỉnh sửa">
                                                <IconButton color="primary" onClick={() => handleOpenEdit(row, index)}>
                                                    <IconEdit size={20} />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Xóa">
                                                <IconButton color="error" onClick={() => handleDelete(index)}>
                                                    <IconTrash size={20} />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <FloodLevelDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSubmit={handleDialogSubmit}
                level={editingLevel}
                isEdit={editingIndex > -1}
            />
        </MainCard>
    );
};

export default FloodLevelSetting;
