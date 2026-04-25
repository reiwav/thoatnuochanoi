import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography, Container } from '@mui/material';
import useAuthStore from 'store/useAuthStore';
import wastewaterTreatmentApi from 'api/wastewaterTreatment';
import WastewaterTreatmentReport from 'views/admin/wastewater-treatment/WastewaterTreatmentReport';
import MainCard from 'ui-component/cards/MainCard';

const EmployeeWastewaterPage = () => {
    const { user } = useAuthStore();
    const [station, setStation] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchAssignedStation = async () => {
        if (!user?.assigned_wastewater_station_id) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const res = await wastewaterTreatmentApi.get(user.assigned_wastewater_station_id);
            setStation(res || null);
        } catch (error) {
            console.error('Failed to fetch assigned station', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssignedStation();
    }, [user?.assigned_wastewater_station_id]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!user?.assigned_wastewater_station_id || !station) {
        return (
            <Container maxWidth="md" sx={{ mt: 4 }}>
                <MainCard sx={{ borderRadius: '24px' }}>
                    <Box sx={{ py: 8, textAlign: 'center' }}>
                        <Typography variant="h4" color="error" sx={{ fontWeight: 700, mb: 1 }}>
                            Chưa được gán trạm
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Bạn chưa được gán vào trạm xử lý nước thải nào. 
                            Vui lòng liên hệ quản lý để được phân công.
                        </Typography>
                    </Box>
                </MainCard>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ mt: { xs: 1, sm: 3 }, px: { xs: 1.5, sm: 3 } }}>
            <WastewaterTreatmentReport 
                station={station} 
                onSuccess={fetchAssignedStation} 
            />
        </Container>
    );
};

export default EmployeeWastewaterPage;
