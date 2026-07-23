import React from 'react';
import { 
    Box, Stack, Typography, Card, CardContent, Grid, Divider, Chip 
} from '@mui/material';
import StatusChip from '../../shared/components/StatusChip';
import ActionButtons from '../../shared/components/ActionButtons';

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
                            {row.DiaChi || 'Chưa cập nhật địa chỉ'}
                        </Typography>
                    </Box>
                    <StatusChip active={row.Active} />
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.5px' }}>
                        ĐƠN VỊ QUẢN LÝ
                    </Typography>
                    {row.data_mode === 'auto' || row.is_auto ? (
                        <Chip label="🤖 Auto" color="info" size="small" sx={{ fontWeight: 700, height: 22, fontSize: '0.75rem' }} />
                    ) : (
                        <Chip label="✍️ Manual" color="default" size="small" sx={{ fontWeight: 600, height: 22, fontSize: '0.75rem' }} />
                    )}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 800, color: 'secondary.main', mt: -1 }}>
                    {organizationName || '-'}
                </Typography>

                <Grid container spacing={1.5} sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: '8px' }}>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.2 }}>TRỌNG SỐ</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>{row.TrongSoBaoCao || 0}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.2 }}>ĐỘ ƯU TIÊN</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>{row.ThuTu || 0}</Typography>
                    </Grid>
                </Grid>

                <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: '8px', bgcolor: 'background.paper' }}>
                    <Typography variant="caption" color="primary.main" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                        CẤU HÌNH NGƯỠNG MỰC NƯỚC
                    </Typography>
                    {row.threshold_configs && row.threshold_configs.length > 0 ? (
                        row.threshold_configs.map((th, idx) => (
                            <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.2 }}>
                                <Typography variant="caption" sx={{ fontWeight: 600 }}>{th.threshold_name}:</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: 'info.main' }}>
                                    {th.min_level} - {th.max_level}
                                </Typography>
                            </Box>
                        ))
                    ) : (
                        <Typography variant="caption" color="text.secondary">
                            Cảnh báo: {row.NguongCanhBao ? `${row.NguongCanhBao}` : 'Chưa thiết lập'}
                        </Typography>
                    )}
                </Box>

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
