import React from 'react';
import {
    Button, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    CircularProgress, Typography, Box, useTheme, Stack
} from '@mui/material';
import { IconPlus, IconClipboardCheck } from '@tabler/icons-react';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import FloodLevelDialog from './FloodLevelDialog';
import useFloodLevelList from './hooks/useFloodLevelList';
import FloodLevelRow from './components/FloodLevelRow';

const FloodLevelSetting = () => {
    const theme = useTheme();
    
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
