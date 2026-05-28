import React, { useState } from 'react';
import {
    TableRow, TableCell, Stack, IconButton, Typography, Chip, Tooltip,
    Collapse, Box, Table, TableBody
} from '@mui/material';
import { IconTrash, IconEdit, IconUsers, IconChevronDown, IconChevronUp, IconClipboardCheck } from '@tabler/icons-react';

const OrgRow = ({ row, handleManageUsers, handleOpenEdit, handleDelete, isMobile, hasPermission }) => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <TableRow hover>
                {isMobile && (
                    <TableCell padding="checkbox">
                        <IconButton size="small" onClick={() => setOpen(!open)}>
                            {open ? <IconChevronUp /> : <IconChevronDown />}
                        </IconButton>
                    </TableCell>
                )}
                <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                {!isMobile && <TableCell>{row.code}</TableCell>}
                {!isMobile && (
                    <TableCell>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                            <IconClipboardCheck size={16} style={{ color: '#64748b' }} />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.order || '-'}</Typography>
                        </Stack>
                    </TableCell>
                )}
                {!isMobile && (
                    <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.phone_number}</Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>{row.email}</Typography>
                    </TableCell>
                )}
                {!isMobile && (
                    <TableCell>
                        <Chip label={row.status ? 'Hoạt động' : 'Ngừng hoạt động'} color={row.status ? 'success' : 'default'} size="small" variant="outlined" />
                    </TableCell>
                )}
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {hasPermission('employee:view') && (
                        <Tooltip title="Quản lý người dùng">
                            <IconButton color="secondary" size="small" onClick={() => handleManageUsers(row)}>
                                <IconUsers size={20} />
                            </IconButton>
                        </Tooltip>
                    )}
                    {hasPermission('organization:edit') && (
                        <Tooltip title="Chỉnh sửa">
                            <IconButton color="primary" size="small" onClick={() => handleOpenEdit(row)}>
                                <IconEdit size={20} />
                            </IconButton>
                        </Tooltip>
                    )}
                    {hasPermission('organization:delete') && (
                        <Tooltip title="Xóa">
                            <IconButton color="error" size="small" onClick={() => handleDelete(row.id)}>
                                <IconTrash size={20} />
                            </IconButton>
                        </Tooltip>
                    )}
                </TableCell>
            </TableRow>
            {isMobile && (
                <TableRow>
                    <TableCell style={{ padding: 0 }} colSpan={3}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 0, backgroundColor: 'grey.50', p: 2 }}>
                                <Typography variant="subtitle2" gutterBottom component="div" sx={{ color: 'primary.main', fontWeight: 600 }}>
                                    Chi tiết đơn vị
                                </Typography>
                                <Table size="small" aria-label="details">
                                    <TableBody>
                                        <TableRow>
                                            <TableCell component="th" scope="row" sx={{ fontWeight: 600, width: '40%', borderBottom: 'none' }}>Mã</TableCell>
                                            <TableCell sx={{ borderBottom: 'none' }}>{row.code}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell component="th" scope="row" sx={{ fontWeight: 600, borderBottom: 'none' }}>Lệnh số</TableCell>
                                            <TableCell sx={{ borderBottom: 'none' }}>{row.order || '-'}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell component="th" scope="row" sx={{ fontWeight: 600, borderBottom: 'none' }}>Liên hệ</TableCell>
                                            <TableCell sx={{ borderBottom: 'none' }}>
                                                <Typography variant="body2">{row.phone_number}</Typography>
                                                <Typography variant="caption" color="textSecondary">{row.email}</Typography>
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell component="th" scope="row" sx={{ fontWeight: 600, borderBottom: 'none' }}>Trạng thái</TableCell>
                                            <TableCell sx={{ borderBottom: 'none' }}>
                                                <Chip label={row.status ? 'Hoạt động' : 'Ngừng hoạt động'} color={row.status ? 'success' : 'default'} size="small" variant="outlined" />
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </Box>
                        </Collapse>
                    </TableCell>
                </TableRow >
            )}
        </>
    );
};

export default OrgRow;
