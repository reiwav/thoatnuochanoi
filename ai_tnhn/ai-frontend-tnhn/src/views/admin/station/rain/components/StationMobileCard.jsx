import React from 'react';
import { 
    Box, Stack, Typography, Card, CardContent, Grid, Divider 
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import StatusChip from '../../shared/components/StatusChip';
import ActionButtons from '../../shared/components/ActionButtons';

const StationMobileCard = ({ row, canEdit, canDelete, handleOpenEdit, handleDelete, organizationName }) => {
    const navigate = useNavigate();
    const stId = row?.OldId ?? row?.old_id ?? row?.OldID ?? row?.Id ?? row?.id ?? '';

    return (
        <Card 
            sx={{ 
                mb: 2, 
                borderRadius: '16px', 
                border: '1px solid', 
                borderColor: 'divider', 
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)', 
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                }
            }}
            onClick={() => navigate(`/admin/station/rain/history?id=${stId}`)}
        >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.dark' }}>{row.TenTram}</Typography>
                        <StatusChip active={row.Active} />
                    </Box>
                    
                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>ĐƠN VỊ QUẢN LÝ</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'secondary.main' }}>{organizationName || '-'}</Typography>
                    </Box>

                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>ƯU TIÊN</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.ThuTu || 0}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>NGƯỠNG</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.NguongCanhBao || '-'}</Typography>
                        </Grid>
                    </Grid>

                    <Divider sx={{ borderStyle: 'dashed' }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{row.DiaChi}</Typography>
                        </Box>
                        <Box onClick={(e) => e.stopPropagation()}>
                            <ActionButtons 
                                row={row} 
                                canEdit={canEdit} 
                                canDelete={canDelete} 
                                handleOpenEdit={handleOpenEdit} 
                                handleDelete={handleDelete} 
                            />
                        </Box>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default React.memo(StationMobileCard);
