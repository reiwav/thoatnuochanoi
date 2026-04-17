import React from 'react';
import { 
    Box, Stack, Typography, Card, CardContent, Grid, Divider 
} from '@mui/material';
import StatusChip from './StatusChip';
import ActionButtons from './ActionButtons';

const StationMobileCard = ({ row, canEdit, canDelete, handleOpenEdit, handleDelete, organizationName }) => (
    <Card sx={{ 
        mb: 2, 
        borderRadius: '16px', 
        border: '1px solid', 
        borderColor: 'divider', 
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        position: 'relative',
        '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            bgcolor: row.Active ? 'success.main' : 'grey.300'
        }
    }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1, pr: 1 }}>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.dark', mb: 0.5 }}>
                            {row.TenTram}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, bgcolor: '#f1f5f9', px: 1, py: 0.5, borderRadius: '4px' }}>
                            {row.Loai || 'Hồ'}
                        </Typography>
                    </Box>
                    <StatusChip active={row.Active} />
                </Box>
                
                <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5, letterSpacing: '0.5px' }}>
                        ĐƠN VỊ QUẢN LÝ
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: 'secondary.main' }}>
                        {organizationName || '-'}
                    </Typography>
                </Box>

                <Grid container spacing={2}>
                    <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.2 }}>THỨ TỰ</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>{row.ThuTu || 0}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.2 }}>TRỌNG SỐ</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>{row.TrongSoBaoCao || 0}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.2 }}>NGƯỠNG</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>{row.NguongCanhBao || '-'}</Typography>
                    </Grid>
                </Grid>

                <Divider sx={{ borderStyle: 'dashed' }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ flex: 1, pr: 2, fontStyle: 'italic' }}>
                        {row.DiaChi || 'Chưa cập nhật địa chỉ'}
                    </Typography>
                    <ActionButtons 
                        row={row} 
                        canEdit={canEdit} 
                        canDelete={canDelete} 
                        handleOpenEdit={handleOpenEdit} 
                        handleDelete={handleDelete} 
                    />
                </Box>
            </Stack>
        </CardContent>
    </Card>
);

export default React.memo(StationMobileCard);
