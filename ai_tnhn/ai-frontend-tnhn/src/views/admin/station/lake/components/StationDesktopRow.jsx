import React from 'react';
import { TableRow, TableCell } from '@mui/material';
import StatusChip from './StatusChip';
import ActionButtons from './ActionButtons';

const StationDesktopRow = ({ row, canEdit, canDelete, handleOpenEdit, handleDelete, organizationName, organizationNamesMap }) => (
    <TableRow hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
        <TableCell sx={{ fontWeight: 800, fontSize: '1rem', color: 'primary.dark' }}>
            {row.TenTram}
        </TableCell>
        <TableCell sx={{ fontSize: '0.9rem', fontWeight: 600 }}>
            {organizationName || '-'}
        </TableCell>
        <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, fontSize: '0.85rem', color: 'text.secondary' }}>
            {row.share_all ? 'Toàn bộ' : (row.shared_org_ids?.map(id => organizationNamesMap[id]).filter(n => n).join(', ') || '-')}
        </TableCell>
        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, fontWeight: 600 }}>
            {row.Loai || '-'}
        </TableCell>
        <TableCell sx={{ display: { xs: 'none', xl: 'table-cell' }, fontSize: '0.85rem' }}>
            {row.DiaChi || '-'}
        </TableCell>
        <TableCell align="center" sx={{ fontWeight: 700 }}>
            {row.ThuTu || 0}
        </TableCell>
        <TableCell align="center" sx={{ fontWeight: 700 }}>
            {row.TrongSoBaoCao || 0}
        </TableCell>
        <TableCell align="center" sx={{ fontWeight: 700, color: 'warning.dark' }}>
            {row.NguongCanhBao || '-'}
        </TableCell>
        <TableCell>
            <StatusChip active={row.Active} />
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

export default React.memo(StationDesktopRow);
