import React from 'react';
import {
    TableRow, TableCell, Typography, Chip, Stack, Tooltip, IconButton, Box
} from '@mui/material';
import { IconTrash, IconEdit } from '@tabler/icons-react';

const FloodLevelRow = ({ row, index, handleOpenEdit, handleDelete }) => {
    return (
        <TableRow hover>
            <TableCell sx={{ fontWeight: 600, pl: 3 }}>
                <Chip label={row.code} size="small" variant="outlined" color="primary" sx={{ fontWeight: 700, borderRadius: '8px' }} />
            </TableCell>
            <TableCell sx={{ fontWeight: 700 }}>{row.name}</TableCell>
            <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {row.min_depth} - {row.max_depth}
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
    );
};

export default FloodLevelRow;
