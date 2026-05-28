import React from 'react';
import { Box, CircularProgress, Typography, Container } from '@mui/material';
import SluiceGateReport from 'views/admin/sluice-gate/SluiceGateReport';
import MainCard from 'ui-component/cards/MainCard';

// Hook
import useEmployeeSluiceGate from './hooks/useEmployeeSluiceGate';

const EmployeeSluiceGatePage = () => {
    const {
        user,
        station,
        loading,
        fetchAssignedStation
    } = useEmployeeSluiceGate();

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!user?.assigned_sluice_gate_id || !station) {
        return (
            <Container maxWidth="md" sx={{ mt: 4 }}>
                <MainCard sx={{ borderRadius: '24px' }}>
                    <Box sx={{ py: 8, textAlign: 'center' }}>
                        <Typography variant="h4" color="error" sx={{ fontWeight: 700, mb: 1 }}>
                            Chưa được gán cửa phai
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Bạn chưa được gán vào cửa phai nào.
                            Vui lòng liên hệ quản lý để được phân công.
                        </Typography>
                    </Box>
                </MainCard>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ mt: { xs: 1, sm: 3 }, px: { xs: 1.5, sm: 3 } }}>
            <SluiceGateReport
                station={station}
                onSuccess={fetchAssignedStation}
            />
        </Container>
    );
};

export default EmployeeSluiceGatePage;
