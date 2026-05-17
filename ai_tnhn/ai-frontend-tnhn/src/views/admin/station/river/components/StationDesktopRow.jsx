import React from 'react';
import { TableRow, TableCell } from '@mui/material';
import StatusChip from '../../shared/components/StatusChip';
import ActionButtons from '../../shared/components/ActionButtons';

const StationDesktopRow = ({ row, canEdit, canDelete, handleOpenEdit, handleDelete, organizationName, organizationNamesMap }) => (
    <TableRow hover>
        <TableCell sx={{ fontWeight: 800, fontSize: '1.05rem', color: 'primary.dark' }}>{row.TenTram}</TableCell>
        <TableCell sx={{ fontSize: '0.95rem', fontWeight: 700 }}>{row.OldId || row.Id || '-'}</TableCell>
        <TableCell sx={{ fontSize: '0.95rem' }}>{row.DiaChi || '-'}</TableCell>
        <TableCell sx={{ fontSize: '0.95rem', fontWeight: 600 }}>{organizationName || '-'}</TableCell>
        <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, fontSize: '0.85rem' }}>
            {row.share_all ? 'Tất cả xí nghiệp' : (row.shared_org_ids?.map(id => organizationNamesMap[id]).filter(n => n).join(', ') || '-')}
        </TableCell>
        <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' }, fontSize: '1rem', fontWeight: 700 }}>{row.TrongSoBaoCao || 0}</TableCell>
        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, fontSize: '1rem', fontWeight: 700 }}>{row.NguongCanhBao || '-'}</TableCell>
        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
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
