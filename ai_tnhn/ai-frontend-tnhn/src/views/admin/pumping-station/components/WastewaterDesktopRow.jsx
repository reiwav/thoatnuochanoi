import React from 'react';
import { 
    TableRow, TableCell, Typography, Box, Grid, alpha, useTheme 
} from '@mui/material';
import dayjs from 'dayjs';
import ActionButtons from './ActionButtons';

const WastewaterDesktopRow = ({ item, index, getOrgNames, onClick, handleHistory, handleEdit, handleDelete, hasPermission, isCompany, user }) => {
    const theme = useTheme();
    const lastReport = item.last_report;

    return (
        <React.Fragment>
            <TableRow 
                hover 
                onClick={() => onClick(item)}
                sx={{ cursor: 'pointer', '& > *': { borderBottom: lastReport ? 'none' : '1px solid', borderColor: 'divider' } }}
            >
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
                        item={item} type="wastewater" hasPermission={hasPermission} isCompany={isCompany} user={user}
                        handleHistory={handleHistory} handleEdit={handleEdit} handleDelete={handleDelete}
                    />
                </TableCell>
            </TableRow>
            {lastReport && (
                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                    <TableCell 
                        onClick={() => onClick(item)}
                        sx={{ py: 0, borderBottom: '1px solid', borderColor: 'divider', cursor: 'pointer' }} colSpan={7}
                    >
                        <Box sx={{ mb: 1.5, mx: 1, p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="caption" color="primary" sx={{ fontWeight: 800, mb: 1, display: 'block' }}>NHẬN XÉT MỚI NHẤT</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={9}>
                                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.primary' }}>"{lastReport.note}"</Typography>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Typography variant="caption" color="text.secondary" align="right" sx={{ display: 'block' }}>
                                        {lastReport.user_name} • {dayjs(lastReport.timestamp * 1000).format('DD/MM/YYYY HH:mm')}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Box>
                    </TableCell>
                </TableRow>
            )}
        </React.Fragment>
    );
};

export default React.memo(WastewaterDesktopRow);
