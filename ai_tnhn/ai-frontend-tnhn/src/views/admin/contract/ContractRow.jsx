import React, { useState } from 'react';
import { TableCell, TableRow, IconButton, Typography, Collapse, Box, Stack } from '@mui/material';
import { IconTrash, IconEdit, IconFileText, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import dayjs from 'dayjs';
import PermissionGuard from 'ui-component/PermissionGuard';
import ContractExpandedDetails from './components/ContractExpandedDetails';

const ContractRow = ({
    row,
    appendices,
    handleOpenEdit,
    handleDelete,
    isMobile,
    formatPrice,
    getTotalPrice,
    hasPermission
}) => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
                <TableCell width={60}>
                    <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={() => setOpen(!open)}
                        color={open ? 'secondary' : 'default'}
                    >
                        {open ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
                    </IconButton>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                        {row.contract_number || '---'}
                    </Typography>
                </TableCell>
                <TableCell component="th" scope="row">
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <IconFileText size={18} style={{ marginRight: 8, color: '#1e88e5' }} />
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{row.name}</Typography>
                        </Box>
                        {(row.investor_name || row.jv_members || (row.joint_venture_members && row.joint_venture_members.length > 0)) && (
                            <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                                {row.investor_name && (
                                    <Box sx={{ bgcolor: '#f8fafc', px: 1, py: 0.15, borderRadius: '4px', border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.2px' }}>CĐT:</Typography>
                                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155', fontSize: '0.65rem' }}>{row.investor_name}</Typography>
                                    </Box>
                                )}
                                {(row.jv_members || (row.joint_venture_members && row.joint_venture_members.length > 0)) && (
                                    <Box sx={{ bgcolor: '#f8fafc', px: 1, py: 0.15, borderRadius: '4px', border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.2px' }}>Liên danh:</Typography>
                                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155', fontSize: '0.65rem' }}>
                                            {row.joint_venture_members && row.joint_venture_members.length > 0 
                                                ? row.joint_venture_members.join(', ') 
                                                : row.jv_members}
                                        </Typography>
                                    </Box>
                                )}
                            </Stack>
                        )}
                    </Box>
                </TableCell>
                {!isMobile && (
                    <TableCell>
                        <Typography variant="body2">
                            {row.start_date ? dayjs(row.start_date).format('DD/MM/YYYY') : '---'}
                        </Typography>
                    </TableCell>
                )}
                {!isMobile && (
                    <TableCell sx={{ fontWeight: 700, color: 'success.main' }}>
                        {formatPrice(getTotalPrice(row.stages))}
                    </TableCell>
                )}
                <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <PermissionGuard permission="contract:edit">
                            <IconButton color="primary" size="small" onClick={() => handleOpenEdit(row)}>
                                <IconEdit size={20} />
                            </IconButton>
                        </PermissionGuard>
                        <PermissionGuard permission="contract:delete">
                            <IconButton color="error" size="small" onClick={() => handleDelete(row.id)}>
                                <IconTrash size={20} />
                            </IconButton>
                        </PermissionGuard>
                    </Stack>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <ContractExpandedDetails
                            row={row}
                            formatPrice={formatPrice}
                            getTotalPrice={getTotalPrice}
                        />
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
};

export default ContractRow;
