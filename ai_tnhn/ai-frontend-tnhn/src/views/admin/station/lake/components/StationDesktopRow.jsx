import React from 'react';
import { TableRow, TableCell, Tooltip, Chip, Typography } from '@mui/material';
import StatusChip from '../../shared/components/StatusChip';
import ActionButtons from '../../shared/components/ActionButtons';

const StationDesktopRow = ({ row, canEdit, canDelete, handleOpenEdit, handleDelete, organizationName, organizationNamesMap }) => (
    <TableRow hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
        <TableCell sx={{ fontWeight: 800, fontSize: '1rem', color: 'primary.dark' }}>
            {row.TenTram}
        </TableCell>
        <TableCell sx={{ fontSize: '0.9rem', fontWeight: 700 }}>
            {row.OldId || row.Id || '-'}
        </TableCell>
        <TableCell sx={{ fontSize: '0.9rem' }}>
            {row.DiaChi || '-'}
        </TableCell>
        <TableCell sx={{ fontSize: '0.9rem', fontWeight: 600 }}>
            {organizationName || '-'}
        </TableCell>
        <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, fontSize: '0.85rem', color: 'text.secondary' }}>
            {row.share_all ? 'Toàn bộ' : (row.shared_org_ids?.map(id => organizationNamesMap[id]).filter(n => n).join(', ') || '-')}
        </TableCell>
        <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
            {row.data_mode === 'auto' || row.is_auto ? (
                <Tooltip title={`ID trạm đo tự động: ${row.OldId || row.Id}`}>
                    <Chip label="🤖 Auto" color="info" size="small" sx={{ fontWeight: 700 }} />
                </Tooltip>
            ) : (
                <Chip label="✍️ Manual" color="default" size="small" sx={{ fontWeight: 600 }} />
            )}
        </TableCell>
        <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' }, fontWeight: 700 }}>
            {row.TrongSoBaoCao || 0}
        </TableCell>
        <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' }, fontSize: '0.85rem' }}>
            {row.threshold_configs && row.threshold_configs.length > 0 ? (
                row.threshold_configs.map((th, idx) => (
                    <Typography key={idx} variant="caption" display="block" sx={{ fontWeight: 600 }}>
                        {th.threshold_name}: {th.min_level}m - {th.max_level}m
                    </Typography>
                ))
            ) : (
                <Typography variant="caption" color="textSecondary">Cảnh báo: {row.NguongCanhBao || '-'}</Typography>
            )}
        </TableCell>
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
