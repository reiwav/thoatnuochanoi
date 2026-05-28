import React from 'react';
import { TableRow, TableCell, Typography, Box, Grid, Stack, useTheme, alpha } from '@mui/material';
import { IconClock, IconUser } from '@tabler/icons-react';
import dayjs from 'dayjs';
import ActionButtons from './ActionButtons';

const WastewaterDesktopRow = ({ item, index, getOrgNames, handleHistory, handleEdit, handleDelete, hasPermission, isCompany, user }) => {
    const theme = useTheme();
    const lastReport = item.last_report;

    return (
        <React.Fragment>
            <TableRow hover sx={{ '& > *': { borderBottom: lastReport ? 'none' : '1px solid', borderColor: 'divider' } }}>
                <TableCell sx={{ width: 40 }} />
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.dark' }}>{item.name}</Typography>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" color="textSecondary">{item.address || '-'}</Typography>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>{getOrgNames(item.org_id)}</Typography>
                </TableCell>
                <TableCell align="center">
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.priority || 0}</Typography>
                </TableCell>
                <TableCell align="right">
                    <ActionButtons
                        item={item} hasPermission={hasPermission} isCompany={isCompany} user={user}
                        handleHistory={handleHistory} handleEdit={handleEdit} handleDelete={handleDelete}
                    />
                </TableCell>
            </TableRow>
            {lastReport && (
                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                    <TableCell sx={{ py: 0, borderBottom: '1px solid', borderColor: 'divider' }} colSpan={7}>
                        <Box sx={{ mb: 1.5, mx: 1, p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 800, color: 'primary.main', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <IconClock size={16} /> Nhận xét vận hành mới nhất
                            </Typography>
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} md={9}>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontStyle: 'italic', bgcolor: 'grey.50', p: 1.5, borderRadius: 1.5, borderLeft: '3px solid', borderColor: 'primary.main' }}>
                                        "{lastReport.note}"
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Stack spacing={0.5}>
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <IconUser size={12} /> {lastReport.user_name}
                                        </Typography>
                                        <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600 }}>
                                            {dayjs(lastReport.timestamp * 1000).format('DD/MM/YYYY HH:mm')}
                                        </Typography>
                                    </Stack>
                                </Grid>
                            </Grid>
                        </Box>
                    </TableCell>
                </TableRow>
            )}
        </React.Fragment>
    );
};

export default WastewaterDesktopRow;
