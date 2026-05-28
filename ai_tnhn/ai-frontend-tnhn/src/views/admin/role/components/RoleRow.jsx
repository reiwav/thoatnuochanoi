import React from 'react';
import {
    TableRow, TableCell, Typography, Chip, Stack, Tooltip, IconButton
} from '@mui/material';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import PermissionGuard from 'ui-component/PermissionGuard';

const RoleRow = ({ row, handleOpenEdit, handleDelete }) => {
    return (
        <TableRow hover>
            <TableCell sx={{ fontWeight: 600, pl: 3 }}>{row.name}</TableCell>
            <TableCell>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'primary.main', fontWeight: 700, bgcolor: 'primary.lighter', px: 1, py: 0.5, borderRadius: 1.5, display: 'inline-block' }}>
                    {row.code}
                </Typography>
            </TableCell>
            <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 700, color: row.level === 0 ? 'error.main' : 'text.primary' }}>
                    {row.level ?? 0}
                </Typography>
            </TableCell>
            <TableCell>
                {row.group ? (
                    <Chip 
                        label={row.group} 
                        size="small" 
                        variant="outlined" 
                        sx={{ fontWeight: 700, color: 'secondary.main', borderColor: 'secondary.main' }} 
                    />
                ) : (
                    <Typography variant="caption" color="text.disabled">Global</Typography>
                )}
            </TableCell>
            <TableCell>
                <Chip 
                    label={row.is_company ? 'Công ty' : 'Xí nghiệp'} 
                    color={row.is_company ? 'primary' : 'default'}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                />
            </TableCell>
            <TableCell>
                <Chip 
                    label={row.is_employee ? 'Nhân viên' : 'Quản lý'} 
                    color={row.is_employee ? 'secondary' : 'info'}
                    size="small"
                    variant="filled"
                    sx={{ fontWeight: 600 }}
                />
            </TableCell>
            <TableCell sx={{ color: 'text.secondary' }}>
                <Typography variant="body2" sx={{ 
                    maxWidth: 250, 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap' 
                }}>
                    {row.description || '-'}
                </Typography>
            </TableCell>
            <TableCell align="right" sx={{ pr: 3 }}>
                <PermissionGuard permission="role:edit">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Chỉnh sửa">
                            <IconButton color="primary" onClick={() => handleOpenEdit(row)}>
                                <IconEdit size={20} />
                            </IconButton>
                        </Tooltip>
                        {row.code !== 'super_admin' && (
                            <Tooltip title="Xóa">
                                <IconButton color="error" onClick={() => handleDelete(row.id, row.code)}>
                                    <IconTrash size={20} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
                </PermissionGuard>
            </TableCell>
        </TableRow>
    );
};

export default RoleRow;
