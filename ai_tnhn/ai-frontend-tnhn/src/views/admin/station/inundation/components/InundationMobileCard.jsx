import React, { useState } from 'react';
import { Card, CardContent, Stack, Box, Typography, Chip, Divider, Button, Collapse } from '@mui/material';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import ActionButtons from './ActionButtons';

const InundationMobileCard = ({ row, canEdit, canDelete, handleOpenEdit, handleDelete, organizationNamesMap }) => {
    const [open, setOpen] = useState(false);
    const sharedOrgText = row.share_all ? 'Tất cả xí nghiệp' : (row.shared_org_ids?.map(id => organizationNamesMap[id]).filter(n => n).join(', ') || '');
    return (
        <Card sx={{ mb: 2, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.dark' }}>{row.name}</Typography>
                        <Chip
                            label={row.active ? 'Hoạt động' : 'Ngừng'}
                            size="small"
                            color={row.active ? 'success' : 'default'}
                            variant="outlined"
                            sx={{ fontWeight: 800, height: 24 }}
                        />
                    </Box>

                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>ĐƠN VỊ QUẢN LÝ</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'secondary.main' }}>{row.org_name || '-'}</Typography>
                    </Box>

                    {sharedOrgText && (
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>ĐƠN VỊ PHỐI HỢP</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: 'text.secondary' }}>{sharedOrgText}</Typography>
                        </Box>
                    )}

                    <Divider sx={{ borderStyle: 'dashed' }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ maxWidth: '60%' }}>{row.address}</Typography>
                        <ActionButtons 
                            row={row} 
                            canEdit={canEdit} 
                            canDelete={canDelete} 
                            handleOpenEdit={handleOpenEdit} 
                            handleDelete={handleDelete} 
                        />
                    </Box>

                    <Button 
                        fullWidth size="small" 
                        variant="light" 
                        onClick={() => setOpen(!open)}
                        endIcon={open ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                        sx={{ borderRadius: '8px', bgcolor: 'grey.50', py: 0.8, fontWeight: 700 }}
                    >
                        {open ? 'Ẩn tọa độ' : 'Xem tọa độ'}
                    </Button>

                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>{row.lat}, {row.lng}</Typography>
                        </Box>
                    </Collapse>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default InundationMobileCard;
