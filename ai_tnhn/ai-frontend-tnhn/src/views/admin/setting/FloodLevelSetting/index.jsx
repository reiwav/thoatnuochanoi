import React from 'react';
import {
    Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    CircularProgress, Typography, Box, useTheme, Stack, useMediaQuery, Grid, Divider, Tooltip, IconButton, Chip
} from '@mui/material';
import { IconPlus, IconClipboardCheck, IconEdit, IconTrash } from '@tabler/icons-react';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import FloodLevelDialog from './FloodLevelDialog';
import useFloodLevelList from './hooks/useFloodLevelList';
import FloodLevelRow from './components/FloodLevelRow';

const FloodLevelSetting = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    const {
        loading,
        saving,
        floodLevels,
        dialogOpen,
        setDialogOpen,
        editingIndex,
        editingLevel,
        handleOpenCreate,
        handleOpenEdit,
        handleDelete,
        handleDialogSubmit
    } = useFloodLevelList();

    return (
        <MainCard
            title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconClipboardCheck size={24} color={theme.palette.primary.main} />
                    <Typography variant="h3" sx={{ fontWeight: 800 }}>Cấu hình ngưỡng ngập</Typography>
                </Box>
            }
            secondary={
                <Stack direction="row" spacing={2}>
                    <AnimateButton>
                        <Button variant="outlined" color="primary" startIcon={<IconPlus size={18} />} onClick={handleOpenCreate}>
                            Thêm mức độ
                        </Button>
                    </AnimateButton>
                </Stack>
            }
        >
            {isMobile ? (
                loading ? (
                    <Box display="flex" justifyContent="center" py={5}>
                        <CircularProgress size={24} color="secondary" />
                    </Box>
                ) : floodLevels.length === 0 ? (
                    <Box textAlign="center" py={5}>
                        <Typography color="textSecondary">Chưa có cấu hình mức độ ngập nào</Typography>
                    </Box>
                ) : (
                    <Stack spacing={2}>
                        {floodLevels.map((row, index) => (
                            <Paper
                                key={index}
                                sx={{
                                    p: 2.5,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: '12px',
                                    borderLeft: `6px solid ${row.color}`,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                    <Box>
                                        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
                                            {row.name}
                                        </Typography>
                                        <Chip label={row.code} size="small" variant="outlined" color="primary" sx={{ fontWeight: 700, borderRadius: '8px' }} />
                                    </Box>
                                    
                                    <Stack direction="row" spacing={0.5}>
                                        <Tooltip title="Chỉnh sửa">
                                            <IconButton size="small" color="primary" onClick={() => handleOpenEdit(row, index)}>
                                                <IconEdit size={18} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Xóa">
                                            <IconButton size="small" color="error" onClick={() => handleDelete(index)}>
                                                <IconTrash size={18} />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                </Box>

                                <Divider sx={{ my: 1 }} />

                                <Grid container spacing={1.5}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="textSecondary" display="block">Ngưỡng độ sâu</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                            {row.min_depth} - {row.max_depth} m
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="textSecondary" display="block">Trạng thái ngập</Typography>
                                        <Chip
                                            label={row.is_flooding ? 'Đang ngập' : 'Bình thường'}
                                            color={row.is_flooding ? 'error' : 'success'}
                                            size="small"
                                            variant="light"
                                            sx={{ fontWeight: 700 }}
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="textSecondary" display="block">Mã màu</Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ width: 14, height: 14, bgcolor: row.color, borderRadius: '3px', border: '1px solid #ddd' }} />
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.color}</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="textSecondary" display="block">Người cập nhật</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.user || '-'}</Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="textSecondary" display="block">Ngày tạo</Typography>
                                        <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                                            {row.ctime ? new Date(row.ctime).toLocaleString('vi-VN') : '-'}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </Paper>
                        ))}
                    </Stack>
                )
            ) : (
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
                                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 3 }}><CircularProgress size={24} color="secondary" /></TableCell></TableRow>
                            ) : floodLevels.length === 0 ? (
                                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 3 }}>Chưa có cấu hình mức độ ngập nào</TableCell></TableRow>
                            ) : (
                                floodLevels.map((row, index) => (
                                    <FloodLevelRow
                                        key={index}
                                        row={row}
                                        index={index}
                                        handleOpenEdit={handleOpenEdit}
                                        handleDelete={handleDelete}
                                    />
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <FloodLevelDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSubmit={handleDialogSubmit}
                level={editingLevel}
                isEdit={editingIndex > -1}
                loading={saving}
            />
        </MainCard>
    );
};

export default FloodLevelSetting;
