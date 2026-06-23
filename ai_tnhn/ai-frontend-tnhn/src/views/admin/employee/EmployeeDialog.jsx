import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, IconButton, Stack
} from '@mui/material';
import { IconX } from '@tabler/icons-react';
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
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {isEdit ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
                <IconButton onClick={onClose} size="small"><IconX size={20} /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    <EmployeeBasicInfoFields
                        formData={formData}
                        handleChange={handleChange}
                        roles={roles}
                        fetchingData={fetchingData}
                        canSelectOrg={canSelectOrg}
                        organizations={organizations}
                        isEdit={isEdit}
                    />

                    {isEmployeeRole && (
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
                    )}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} color="inherit" sx={{ borderRadius: 3 }}>Hủy</Button>
                <Button variant="contained" onClick={() => handleSave(onSubmit)} color="primary" sx={{ borderRadius: 3, fontWeight: 700 }}>
                    {isEdit ? 'Cập nhật' : 'Thêm mới'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default EmployeeDialog;
