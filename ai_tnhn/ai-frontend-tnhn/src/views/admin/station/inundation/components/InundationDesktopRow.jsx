import React from 'react';
import { TableRow, TableCell, Typography, Chip } from '@mui/material';
import ActionButtons from './ActionButtons';

const InundationDesktopRow = ({ row, canEdit, canDelete, handleOpenEdit, handleDelete, organizationNamesMap }) => (
    <TableRow hover>
        <TableCell>
            <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.dark' }}>{row.name}</Typography>
        </TableCell>
        <TableCell>
            <Typography variant="body2" color="textSecondary">{row.address || '-'}</Typography>
        </TableCell>
        <TableCell>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'secondary.main' }}>{row.org_name || '-'}</Typography>
        </TableCell>
        <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                {row.share_all ? 'Tất cả xí nghiệp' : (row.shared_org_ids?.map(id => organizationNamesMap[id]).filter(n => n).join(', ') || '-')}
            </Typography>
        </TableCell>
        <TableCell>
            <Chip label={row.active ? 'Hoạt động' : 'Ngừng'}
                color={row.active ? 'success' : 'default'} size="small" variant="outlined" sx={{ fontWeight: 800, fontSize: '0.75rem', height: 24 }} />
        </TableCell>
        {(canEdit || canDelete) && (
            <TableCell align="right">
                <ActionButtons 
                    row={row} 
                    canEdit={canEdit} 
                    canDelete={canDelete} 
                    handleOpenEdit={handleOpenEdit} 
                    handleDelete={handleDelete} 
                />
            </TableCell>
        )}
    </TableRow>
);

export default InundationDesktopRow;
