import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography,
    Box, TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Paper, CircularProgress, Stack, Chip
} from '@mui/material';
import { IconDeviceFloppy, IconX, IconEdit } from '@tabler/icons-react';
import GridCellInput from './GridCellInput';

const EditGroupDialog = ({
    open,
    onClose,
    group,
    mode,
    flexibleSlots,
    gridValues,
    handleCellChange,
    getCellThresholdStatus,
    handleSaveGroup,
    saving
}) => {
    if (!group) return null;

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth="md" 
            fullWidth 
            PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconEdit size={22} color="#673ab7" />
                    <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary' }}>
                        NHẬP DỮ LIỆU - {group.orgName}
                    </Typography>
                </Box>
                <Button onClick={onClose} sx={{ minWidth: 32, p: 0.5, color: 'text.secondary' }}>
                    <IconX size={20} />
                </Button>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 2 }}>
                <TableContainer 
                    component={Paper} 
                    elevation={0} 
                    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px' }}
                >
                    <Table stickyHeader size="small">
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell width={50} align="center" sx={{ fontWeight: 800 }}>STT</TableCell>
                                <TableCell width={80} align="center" sx={{ fontWeight: 800 }}>Old ID</TableCell>
                                <TableCell width={200} sx={{ fontWeight: 800 }}>Tên trạm / Điểm đo</TableCell>

                                {mode === 'fixed' ? (
                                    <>
                                        <TableCell width={120} align="center" sx={{ fontWeight: 800 }}>6h30</TableCell>
                                        <TableCell width={120} align="center" sx={{ fontWeight: 800 }}>13h30</TableCell>
                                        <TableCell width={120} align="center" sx={{ fontWeight: 800 }}>Hiện tại</TableCell>
                                        <TableCell width={120} align="center" sx={{ fontWeight: 800 }}>Chênh lệch</TableCell>
                                    </>
                                ) : (
                                    flexibleSlots.map(slot => (
                                        <TableCell 
                                            key={slot.key} 
                                            width={110} 
                                            align="center"
                                            sx={{ 
                                                fontWeight: 800,
                                                bgcolor: 'grey.50',
                                                color: slot.isT0 ? 'primary.main' : 'text.primary',
                                                borderBottom: slot.isT0 ? '2px solid' : 'none',
                                                borderColor: 'primary.main'
                                            }}
                                        >
                                            <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
                                                <span>{slot.label}</span>
                                                {slot.isT0 && (
                                                    <Chip label="T0" color="primary" size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 900, px: 0.2 }} />
                                                )}
                                            </Stack>
                                        </TableCell>
                                    ))
                                )}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {group.stations.map((st, idx) => {
                                const oldId = st.OldId || st.old_id || st.Id || st.id;

                                if (mode === 'fixed') {
                                    const v630 = gridValues[`${st.type}_${oldId}_6h30`] || '';
                                    const v1330 = gridValues[`${st.type}_${oldId}_13h30`] || '';
                                    const vNow = gridValues[`${st.type}_${oldId}_now`] || '';

                                    const st630 = getCellThresholdStatus(st, '6h30', v630);
                                    const st1330 = getCellThresholdStatus(st, '13h30', v1330);
                                    const stNow = getCellThresholdStatus(st, 'now', vNow);

                                    let diffText = '-';
                                    if (vNow !== '' && v1330 !== '') {
                                        const diff = parseFloat(vNow) - parseFloat(v1330);
                                        diffText = (diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)) + 'm';
                                    } else if (v1330 !== '' && v630 !== '') {
                                        const diff = parseFloat(v1330) - parseFloat(v630);
                                        diffText = (diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)) + 'm';
                                    }

                                    return (
                                        <TableRow key={st.id || idx} hover>
                                            <TableCell align="center" sx={{ fontWeight: 700 }}>{idx + 1}</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 700, color: 'text.secondary' }}>{oldId}</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>{st.TenTram || st.ten_tram}</TableCell>

                                            {/* 6h30 */}
                                            <GridCellInput
                                                value={v630}
                                                onChange={(val) => handleCellChange(st.type, oldId, '6h30', val)}
                                                placeholder="VD: 1.5"
                                                status={st630}
                                                isT0={false}
                                            />

                                            {/* 13h30 */}
                                            <GridCellInput
                                                value={v1330}
                                                onChange={(val) => handleCellChange(st.type, oldId, '13h30', val)}
                                                placeholder="VD: 2.0"
                                                status={st1330}
                                                isT0={false}
                                            />

                                            {/* Hiện tại */}
                                            <GridCellInput
                                                value={vNow}
                                                onChange={(val) => handleCellChange(st.type, oldId, 'now', val)}
                                                placeholder="VD: 2.2"
                                                status={stNow}
                                                isT0={false}
                                            />

                                            {/* Chênh lệch */}
                                            <TableCell align="center" sx={{ fontWeight: 800, color: diffText.startsWith('+') ? 'error.main' : 'success.main' }}>
                                                {diffText}
                                            </TableCell>
                                        </TableRow>
                                    );
                                } else {
                                    return (
                                        <TableRow key={st.id || idx} hover>
                                            <TableCell align="center" sx={{ fontWeight: 700 }}>{idx + 1}</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 700, color: 'text.secondary' }}>{oldId}</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>{st.TenTram || st.ten_tram}</TableCell>

                                            {flexibleSlots.map(slot => {
                                                const val = gridValues[`${st.type}_${oldId}_${slot.key}`] || '';
                                                const stStatus = getCellThresholdStatus(st, slot.key, val);

                                                return (
                                                    <GridCellInput
                                                        key={slot.key}
                                                        value={val}
                                                        onChange={(nVal) => handleCellChange(st.type, oldId, slot.key, nVal)}
                                                        placeholder=""
                                                        status={stStatus}
                                                        isT0={slot.isT0}
                                                    />
                                                );
                                            })}
                                        </TableRow>
                                    );
                                }
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} color="inherit" sx={{ fontWeight: 700 }}>
                    Hủy
                </Button>
                <Button
                    variant="contained"
                    color="secondary"
                    startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <IconDeviceFloppy size={20} />}
                    onClick={() => handleSaveGroup(group)}
                    disabled={saving}
                    sx={{ borderRadius: '10px', fontWeight: 800, px: 3 }}
                >
                    {saving ? 'Đang lưu...' : `Lưu dữ liệu ${group.orgName}`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default EditGroupDialog;
