import React from 'react';
import { 
    Box, Stack, Typography, Card, CardContent, Divider 
} from '@mui/material';
import ActionButtons from './ActionButtons';

const WastewaterMobileCard = ({ item, index, getOrgNames, onClick, handleHistory, handleEdit, handleDelete, hasPermission, isCompany, user }) => {
    const sharedOrgText = item.share_all ? 'Tất cả xí nghiệp' : getOrgNames(item.shared_org_ids);
    return (
        <Card 
            onClick={() => onClick(item)}
            sx={{ mb: 2, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden', cursor: 'pointer' }}
        >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack spacing={1.5}>
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.dark', mb: 0.5 }}>{item.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.address || '-'}</Typography>
                    </Box>

                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.2 }}>QUẢN LÝ</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>{getOrgNames(item.org_id)}</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.2 }}>SỐ BC</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>{item.priority || 0}</Typography>
                        </Box>
                    </Stack>

                    {sharedOrgText && (
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.2 }}>ĐƠN VỊ PHỐI HỢP</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: 'text.secondary' }}>{sharedOrgText}</Typography>
                        </Box>
                    )}

                    {item.last_report && (
                        <>
                            <Divider sx={{ borderStyle: 'dashed' }} />
                            <Box sx={{ bgcolor: 'grey.50', p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="caption" color="primary" sx={{ fontWeight: 800, display: 'block', mb: 0.5 }}>NHẬN XÉT MỚI NHẤT</Typography>
                                <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', fontSize: '0.8rem' }}>
                                    "{item.last_report.note}"
                                </Typography>
                            </Box>
                        </>
                    )}

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <ActionButtons
                            item={item} type="wastewater" hasPermission={hasPermission} isCompany={isCompany} user={user}
                            handleHistory={handleHistory} handleEdit={handleEdit} handleDelete={handleDelete}
                        />
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default React.memo(WastewaterMobileCard);
