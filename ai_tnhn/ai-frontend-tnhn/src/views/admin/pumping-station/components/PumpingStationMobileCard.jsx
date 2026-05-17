import React from 'react';
import { 
    Box, Stack, Typography, Card, CardContent, Grid, Divider, Chip 
} from '@mui/material';
import ActionButtons from './ActionButtons';

const PumpingStationMobileCard = ({ item, index, getOrgNames, handleHistory, handleEdit, handleDelete, hasPermission, isCompany, user }) => {
    const sharedOrgText = item.share_all ? 'Tất cả xí nghiệp' : getOrgNames(item.shared_org_ids);
    return (
        <Card sx={{ mb: 2, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1, pr: 1 }}>
                            <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.dark', mb: 0.5 }}>{item.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{item.address || '-'}</Typography>
                        </Box>
                        <Chip
                            label={item.is_auto ? 'Tự động' : 'Thủ công'}
                            size="small"
                            color={item.is_auto ? 'primary' : 'default'}
                            variant={item.is_auto ? 'filled' : 'outlined'}
                            sx={{ fontWeight: 700 }}
                        />
                    </Box>

                    <Grid container spacing={2}>
                        <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.2 }}>SỐ BƠM</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>{item.pump_count}</Typography>
                        </Grid>
                        <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.2 }}>SỐ BC</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>{item.priority || 0}</Typography>
                        </Grid>
                        <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.2 }}>QUẢN LÝ</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }} noWrap>{getOrgNames(item.org_id)}</Typography>
                        </Grid>
                    </Grid>

                    {sharedOrgText && (
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.2 }}>ĐƠN VỊ PHỐI HỢP</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: 'text.secondary' }}>{sharedOrgText}</Typography>
                        </Box>
                    )}

                    <Divider sx={{ borderStyle: 'dashed' }} />

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <ActionButtons
                            item={item} type="pumping" hasPermission={hasPermission} isCompany={isCompany} user={user}
                            handleHistory={handleHistory} handleEdit={handleEdit} handleDelete={handleDelete}
                        />
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default React.memo(PumpingStationMobileCard);
