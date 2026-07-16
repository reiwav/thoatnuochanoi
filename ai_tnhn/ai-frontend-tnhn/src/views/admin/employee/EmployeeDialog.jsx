import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, IconButton, Stack, Grid, Box, Typography
} from '@mui/material';
import { IconX, IconUser, IconMapPin } from '@tabler/icons-react';
import EmployeeBasicInfoFields from './components/EmployeeBasicInfoFields';
import EmployeeAssignmentsSection from './components/EmployeeAssignmentsSection';
import useEmployeeDialog from './hooks/useEmployeeDialog';

const EmployeeDialog = ({ open, onClose, onSubmit, employee, isEdit, organizations = [], defaultOrgId = '', canSelectOrg }) => {
    const {
        hasPermission,
        userRole,
        formData,
        handleChange,
        handleSave,
        points,
        constructions,
        pumpingStations,
        wastewaterStations,
        sluiceGates,
        lakes,
        rivers,
        roles,
        fetchingData,
        isEmployeeRole
    } = useEmployeeDialog({ open, employee, isEdit, defaultOrgId, canSelectOrg });

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth={isEmployeeRole ? "md" : "sm"} 
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '16px',
                    boxShadow: '0px 20px 25px -5px rgba(0, 0, 0, 0.1), 0px 10px 10px -5px rgba(0, 0, 0, 0.04)',
                }
            }}
        >
            <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2, px: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    {isEdit ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
                </Typography>
                <IconButton onClick={onClose} size="small"><IconX size={20} /></IconButton>
            </DialogTitle>
            <DialogContent 
                dividers 
                sx={{ 
                    p: 0, 
                    overflowY: { xs: 'auto', md: isEmployeeRole ? 'hidden' : 'auto' }
                }}
            >
                {isEmployeeRole ? (
                    <Grid container>
                        {/* Cột trái: Thông tin cơ bản */}
                        <Grid 
                            size={{ xs: 12, md: 5 }}
                            sx={{ 
                                p: 3, 
                                display: 'flex',
                                flexDirection: 'column',
                                borderRight: { md: '1px solid' }, 
                                borderColor: { md: 'divider' } 
                            }}
                        >
                            <Stack spacing={3}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <IconUser size={18} style={{ color: '#1e293b' }} />
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                        Thông tin cơ bản
                                    </Typography>
                                </Box>
                                <EmployeeBasicInfoFields
                                    formData={formData}
                                    handleChange={handleChange}
                                    roles={roles}
                                    fetchingData={fetchingData}
                                    canSelectOrg={canSelectOrg}
                                    organizations={organizations}
                                    isEdit={isEdit}
                                />
                            </Stack>
                        </Grid>

                        {/* Cột phải: Phân công trạm */}
                        <Grid 
                            size={{ xs: 12, md: 7 }}
                            sx={{ 
                                p: 3, 
                                bgcolor: '#f8fafc',
                                maxHeight: { xs: 'none', md: '65vh' }, 
                                overflowY: { xs: 'visible', md: 'auto' },
                                '&::-webkit-scrollbar': {
                                    width: '6px',
                                },
                                '&::-webkit-scrollbar-thumb': {
                                    backgroundColor: '#cbd5e1',
                                    borderRadius: '3px',
                                },
                                '&::-webkit-scrollbar-track': {
                                    backgroundColor: 'transparent',
                                }
                            }}
                        >
                            <Stack spacing={3}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <IconMapPin size={18} style={{ color: '#0284c7' }} />
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0284c7' }}>
                                        Phân công quản lý trạm
                                    </Typography>
                                </Box>
                                <EmployeeAssignmentsSection
                                    formData={formData}
                                    handleChange={handleChange}
                                    points={points}
                                    constructions={constructions}
                                    pumpingStations={pumpingStations}
                                    wastewaterStations={wastewaterStations}
                                    sluiceGates={sluiceGates}
                                    lakes={lakes}
                                    rivers={rivers}
                                />
                            </Stack>
                        </Grid>
                    </Grid>
                ) : (
                    <Stack spacing={3} sx={{ p: 3 }}>
                        <EmployeeBasicInfoFields
                            formData={formData}
                            handleChange={handleChange}
                            roles={roles}
                            fetchingData={fetchingData}
                            canSelectOrg={canSelectOrg}
                            organizations={organizations}
                            isEdit={isEdit}
                        />
                    </Stack>
                )}
            </DialogContent>
            <DialogActions sx={{ py: 2, px: 3, borderTop: '1px solid', borderColor: 'divider' }}>
                <Button onClick={onClose} color="inherit" sx={{ borderRadius: '10px', fontWeight: 600, px: 3 }}>Hủy</Button>
                <Button 
                    variant="contained" 
                    onClick={() => handleSave(onSubmit)} 
                    color="primary" 
                    sx={{ 
                        borderRadius: '10px', 
                        fontWeight: 700, 
                        px: 3,
                        boxShadow: 'none',
                        '&:hover': {
                            boxShadow: 'none'
                        }
                    }}
                >
                    {isEdit ? 'Cập nhật' : 'Thêm mới'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default EmployeeDialog;
