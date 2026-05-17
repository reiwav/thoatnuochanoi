import React, { useState } from 'react';
import { 
    TableRow, TableCell, IconButton, Typography, Chip, 
    Collapse, Box, Grid, Stack, useTheme 
} from '@mui/material';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import dayjs from 'dayjs';
import ActionButtons from './ActionButtons';

const PumpingStationDesktopRow = ({ item, index, getOrgNames, handleHistory, handleEdit, handleDelete, hasPermission, isCompany, user }) => {
    const theme = useTheme();
    const [open, setOpen] = useState(false);
    const lastReport = item.last_report;

    return (
        <React.Fragment>
            <TableRow hover sx={{ '& > *': { borderBottom: lastReport ? '1px dashed' : '1px solid', borderColor: 'divider' } }}>
                <TableCell sx={{ width: 40 }}>
                    {lastReport && (
                        <IconButton size="small" onClick={() => setOpen(!open)}>
                            {open ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
                        </IconButton>
                    )}
                </TableCell>
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.dark' }}>{item.name}</Typography>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" color="textSecondary">{item.address || '-'}</Typography>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.pump_count}</Typography>
                </TableCell>
                <TableCell>
                    <Chip
                        label={item.is_auto ? 'Tự động' : 'Thủ công'}
                        size="small"
                        color={item.is_auto ? 'primary' : 'default'}
                        variant={item.is_auto ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 700 }}
                    />
                </TableCell>
                <TableCell>
                    <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>{getOrgNames(item.org_id)}</Typography>
                </TableCell>
                <TableCell align="center">
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.priority || 0}</Typography>
                </TableCell>
                <TableCell align="right">
                    <ActionButtons
                        item={item} type="pumping" hasPermission={hasPermission} isCompany={isCompany} user={user}
                        handleHistory={handleHistory} handleEdit={handleEdit} handleDelete={handleDelete}
                    />
                </TableCell>
            </TableRow>
            {lastReport && (
                <TableRow>
                    <TableCell sx={{ py: 0 }} colSpan={9}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                            <Box sx={{ my: 2, mx: 1, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 800, color: 'primary.main', mb: 1.5 }}>
                                    Trạng thái vận hành mới nhất
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={6} sm={3}>
                                        <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'error.light', textAlign: 'center' }}>
                                            <Typography variant="caption" color="error.main" sx={{ fontWeight: 800, display: 'block' }}>VẬN HÀNH</Typography>
                                            <Typography variant="h4" sx={{ fontWeight: 900 }}>{lastReport.operating_count}</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'success.light', textAlign: 'center' }}>
                                            <Typography variant="caption" color="success.main" sx={{ fontWeight: 800, display: 'block' }}>DỪNG</Typography>
                                            <Typography variant="h4" sx={{ fontWeight: 900 }}>{lastReport.closed_count}</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'warning.light', textAlign: 'center' }}>
                                            <Typography variant="caption" color="warning.dark" sx={{ fontWeight: 800, display: 'block' }}>BẢO DƯỠNG</Typography>
                                            <Typography variant="h4" sx={{ fontWeight: 900 }}>{lastReport.maintenance_count}</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'grey.300', textAlign: 'center' }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block' }}>KO TÍN HIỆU</Typography>
                                            <Typography variant="h4" sx={{ fontWeight: 900 }}>{lastReport.no_signal_count}</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Stack spacing={0.5}>
                                            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>"{lastReport.note || 'Không có ghi chú'}"</Typography>
                                            <Typography variant="caption" color="text.disabled">
                                                {lastReport.user_name} • {dayjs(lastReport.timestamp * 1000).format('DD/MM/YYYY HH:mm')}
                                            </Typography>
                                        </Stack>
                                    </Grid>
                                </Grid>
                            </Box>
                        </Collapse>
                    </TableCell>
                </TableRow>
            )}
        </React.Fragment>
    );
};

export default React.memo(PumpingStationDesktopRow);
