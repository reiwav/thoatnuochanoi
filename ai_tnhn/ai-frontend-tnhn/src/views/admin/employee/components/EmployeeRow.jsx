import React, { useState } from 'react';
import {
    TableRow, TableCell, IconButton, Typography, Chip, Collapse, Box, Table, TableBody
} from '@mui/material';
import { IconChevronUp, IconChevronDown, IconEdit, IconTrash } from '@tabler/icons-react';

const stringToColor = (string) => {
    let hash = 0;
    let i;
    for (i = 0; i < string.length; i += 1) {
        hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (i = 0; i < 3; i += 1) {
        const value = (hash >> (i * 8)) & 0xff;
        color += `00${value.toString(16)}`.slice(-2);
    }
    return color;
};

const getContrastText = (hexcolor) => {
    if (!hexcolor || hexcolor.length < 7) return '#fff';
    const r = parseInt(hexcolor.slice(1, 3), 16);
    const g = parseInt(hexcolor.slice(3, 5), 16);
    const b = parseInt(hexcolor.slice(5, 7), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#000' : '#fff';
};

const EmployeeRow = ({ row, handleOpenEdit, handleDelete, roleLabel, orgName, userRole, isMobile, hasPermission }) => {
    const [open, setOpen] = useState(false);
    const roleTxt = roleLabel(row.role);
    const bgColor = stringToColor(roleTxt);
    const textColor = getContrastText(bgColor);

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
                {!isMobile && <TableCell>{row.email}</TableCell>}
                {!isMobile && userRole !== 'admin_org' && (
                    <TableCell>
                        <Typography variant="caption" color="textSecondary">{orgName(row.org_id)}</Typography>
                    </TableCell>
                )}
                {!isMobile && (
                    <TableCell>
                        <Chip
                            label={roleTxt}
                            size="small"
                            sx={{
                                bgcolor: bgColor,
                                color: textColor,
                                fontWeight: 700,
                                borderRadius: '8px',
                                border: 'none'
                            }}
                        />
                    </TableCell>
                )}
                {!isMobile && (
                    <TableCell>
                        <Chip label={row.active ? 'Hoạt động' : 'Ngừng hoạt động'} color={row.active ? 'success' : 'default'} size="small" variant="outlined" />
                    </TableCell>
                )}
                <TableCell align="right" sx={{
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    right: 0,
                    bgcolor: 'background.paper',
                    zIndex: 1,
                    borderLeft: '1px solid',
                    borderColor: 'divider'
                }}>
                    {hasPermission('employee:edit') && (
                        <IconButton color="primary" size="small" onClick={() => handleOpenEdit(row)}>
                            <IconEdit size={20} />
                        </IconButton>
                    )}
                    {hasPermission('employee:delete') && (
                        <IconButton color="error" size="small" onClick={() => handleDelete(row)}>
                            <IconTrash size={20} />
                        </IconButton>
                    )}
                </TableCell>
            </TableRow>
            {isMobile && (
                <TableRow>
                    <TableCell style={{ padding: 0 }} colSpan={3}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 0, backgroundColor: 'grey.50', p: 2 }}>
                                <Typography variant="subtitle2" gutterBottom component="div" sx={{ color: 'primary.main', fontWeight: 600 }}>
                                    Chi tiết người dùng
                                </Typography>
                                <Table size="small" aria-label="details">
                                    <TableBody>
                                        <TableRow>
                                            <TableCell component="th" scope="row" sx={{ fontWeight: 600, width: '40%', borderBottom: 'none' }}>Email</TableCell>
                                            <TableCell sx={{ borderBottom: 'none' }}>{row.email}</TableCell>
                                        </TableRow>
                                        {userRole !== 'admin_org' && (
                                            <TableRow>
                                                <TableCell component="th" scope="row" sx={{ fontWeight: 600, borderBottom: 'none' }}>Công ty</TableCell>
                                                <TableCell sx={{ borderBottom: 'none' }}>
                                                    <Typography variant="body2">{orgName(row.org_id)}</Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        <TableRow>
                                            <TableCell component="th" scope="row" sx={{ fontWeight: 600, borderBottom: 'none' }}>Vai trò</TableCell>
                                            <TableCell sx={{ borderBottom: 'none' }}>
                                                <Chip
                                                    label={roleTxt}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: bgColor,
                                                        color: textColor,
                                                        fontWeight: 700,
                                                        borderRadius: '8px',
                                                        border: 'none'
                                                    }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell component="th" scope="row" sx={{ fontWeight: 600, borderBottom: 'none' }}>Trạng thái</TableCell>
                                            <TableCell sx={{ borderBottom: 'none' }}>
                                                <Chip label={row.active ? 'Hoạt động' : 'Ngừng hoạt động'} color={row.active ? 'success' : 'default'} size="small" variant="outlined" />
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </Box>
                        </Collapse>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
};

export default EmployeeRow;
