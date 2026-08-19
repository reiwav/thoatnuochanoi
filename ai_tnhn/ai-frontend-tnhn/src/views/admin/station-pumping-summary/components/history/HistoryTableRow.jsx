import React from 'react';
import { 
    TableRow, TableCell, Stack, Avatar, Typography, alpha, useTheme 
} from '@mui/material';
import { IconUser } from '@tabler/icons-react';
import dayjs from 'dayjs';
import HistoryStatusChip from './HistoryStatusChip';

const HistoryTableRow = ({ row, isPumping }) => {
    const theme = useTheme();

    return (
        <TableRow 
            hover
            sx={{ 
                '&:last-child td, &:last-child th': { border: 0 },
                transition: 'background-color 0.2s ease'
            }}
        >
            {/* Thời gian */}
            <TableCell sx={{ py: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                    {dayjs(row.timestamp * 1000).format('DD/MM/YYYY')}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {dayjs(row.timestamp * 1000).format('HH:mm:ss')}
                </Typography>
            </TableCell>

            {/* Người gửi */}
            <TableCell sx={{ py: 1.5 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar 
                        sx={{ 
                            width: 28, 
                            height: 28, 
                            bgcolor: alpha(theme.palette.primary.main, 0.1), 
                            color: 'primary.main', 
                            fontSize: '0.75rem',
                            fontWeight: 800
                        }}
                    >
                        {row.user_name ? row.user_name.charAt(0).toUpperCase() : <IconUser size={16} />}
                    </Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {row.user_name || 'Hệ thống'}
                    </Typography>
                </Stack>
            </TableCell>

            {/* Các cột trạng thái cho Trạm Bơm */}
            {isPumping && (
                <>
                    <TableCell align="center" sx={{ py: 1.5 }}>
                        <HistoryStatusChip type="operating" count={row.operating_count} />
                    </TableCell>
                    <TableCell align="center" sx={{ py: 1.5 }}>
                        <HistoryStatusChip type="closed" count={row.closed_count} />
                    </TableCell>
                    <TableCell align="center" sx={{ py: 1.5 }}>
                        <HistoryStatusChip type="maintenance" count={row.maintenance_count} />
                    </TableCell>
                    <TableCell align="center" sx={{ py: 1.5 }}>
                        <HistoryStatusChip type="no_signal" count={row.no_signal_count} />
                    </TableCell>
                </>
            )}

            {/* Ghi chú */}
            <TableCell sx={{ py: 1.5 }}>
                {row.note ? (
                    <Typography 
                        variant="body2" 
                        sx={{ 
                            color: 'text.primary', 
                            lineHeight: 1.5, 
                            fontWeight: 500,
                            whiteSpace: 'pre-wrap'
                        }}
                    >
                        {row.note}
                    </Typography>
                ) : (
                    <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                        Không có ghi chú
                    </Typography>
                )}
            </TableCell>
        </TableRow>
    );
};

export default HistoryTableRow;
