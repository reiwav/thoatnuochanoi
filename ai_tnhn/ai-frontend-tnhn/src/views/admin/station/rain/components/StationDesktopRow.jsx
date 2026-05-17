import React from 'react';
import { TableRow, TableCell, Chip } from '@mui/material';
import StatusChip from '../../shared/components/StatusChip';
import ActionButtons from '../../shared/components/ActionButtons';

const StationDesktopRow = ({ row, canEdit, canDelete, handleOpenEdit, handleDelete, organizationName, organizationNamesMap }) => (
    <TableRow hover>
        <TableCell sx={{ fontWeight: 800, fontSize: '1.05rem', color: 'primary.dark' }}>{row.TenTram}</TableCell>
        <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, fontSize: '0.95rem' }}>{row.DiaChi}</TableCell>
        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, fontSize: '0.95rem' }}>
            {row.Loai ? (
                <Chip
                    label={row.Loai === 'phuong' ? 'Phường' : (row.Loai === 'xa' ? 'Xã' : 'Thị trấn')}
                    color={row.Loai === 'phuong' ? 'primary' : (row.Loai === 'xa' ? 'secondary' : 'info')}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 700, borderRadius: '6px' }}
                />
            ) : '-'}
        </TableCell>
        <TableCell sx={{ fontSize: '0.95rem', fontWeight: 600 }}>{organizationName || '-'}</TableCell>
        <TableCell sx={{ display: { xs: 'none', xl: 'table-cell' }, fontSize: '0.85rem' }}>
            {row.share_all ? 'Tất cả xí nghiệp' : (row.shared_org_ids?.map(id => organizationNamesMap[id]).filter(n => n).join(', ') || '-')}
        </TableCell>
        <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' }, fontSize: '1rem', fontWeight: 700 }}>{row.ThuTu || 0}</TableCell>
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
