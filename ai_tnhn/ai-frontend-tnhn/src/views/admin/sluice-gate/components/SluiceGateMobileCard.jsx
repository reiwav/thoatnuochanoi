import React from 'react';
import { Card, CardContent, Stack, Box, Typography, Divider } from '@mui/material';
import ActionButtons from './ActionButtons';
import ReportSummary from './ReportSummary';

const SluiceGateMobileCard = ({ item, getOrgNames, handleHistory, handleEdit, handleDelete, hasPermission, isCompany, user }) => {
    const lastReport = item.last_report;
    return (
        <Card sx={{ mb: 2, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.dark' }}>{item.name}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>ĐƠN VỊ QUẢN LÝ</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'secondary.main' }}>{getOrgNames(item.org_id) || '-'}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>TRẠNG THÁI GẦN NHẤT</Typography>
                        {lastReport ? (
                            <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider', mt: 0.5 }}>
                                <ReportSummary lastReport={lastReport} />
                            </Box>
                        ) : (
                            <Typography variant="caption" color="text.disabled">Chưa có báo cáo</Typography>
                        )}
                    </Box>
                    <Divider sx={{ borderStyle: 'dashed' }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ maxWidth: '60%' }}>{item.address}</Typography>
                        <ActionButtons
                            item={item} hasPermission={hasPermission} isCompany={isCompany} user={user}
                            handleHistory={handleHistory} handleEdit={handleEdit} handleDelete={handleDelete}
                        />
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default SluiceGateMobileCard;
