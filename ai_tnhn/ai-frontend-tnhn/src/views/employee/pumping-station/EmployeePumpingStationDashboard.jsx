import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Stack, Avatar, Skeleton, CircularProgress,
    Alert, AlertTitle
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconTools, IconEngine, IconArrowLeft } from '@tabler/icons-react';

import useAuthStore from 'store/useAuthStore';
import usePumpingStationStore from 'store/usePumpingStationStore';
import pumpingStationApi from 'api/pumpingStation';

// Components
import PumpingStationCard from './components/PumpingStationCard';
import PumpingStationReport from 'views/admin/pumping-station/PumpingStationReport';

const EmployeePumpingStationDashboard = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { user, isEmployee } = useAuthStore();
    const { pumpingStations, loading, fetchPumpingStations } = usePumpingStationStore();
    
    const [assignedStation, setAssignedStation] = useState(null);
    const [fetchingAssigned, setFetchingAssigned] = useState(false);

    const basePath = '/employee';

    // 1. Fetch Assigned Station if any
    useEffect(() => {
        const fetchAssigned = async () => {
            if (user?.assigned_pumping_station_id) {
                setFetchingAssigned(true);
                try {
                    const res = await pumpingStationApi.get(user.assigned_pumping_station_id);
                    setAssignedStation(res);
                } catch (err) {
                    console.error('Failed to fetch assigned station:', err);
                } finally {
                    setFetchingAssigned(false);
                }
            } else {
                // If not assigned, fetch all available stations
                fetchPumpingStations();
            }
        };
        fetchAssigned();
    }, [user?.assigned_pumping_station_id]);

    // Polling only if not looking at a specific assigned station report
    useEffect(() => {
        if (!user?.assigned_pumping_station_id) {
            const interval = setInterval(() => {
                fetchPumpingStations();
            }, 10000);
            return () => clearInterval(interval);
        }
    }, [user?.assigned_pumping_station_id]);

    const handleRefreshAssigned = async () => {
        if (user?.assigned_pumping_station_id) {
            const res = await pumpingStationApi.get(user.assigned_pumping_station_id);
            setAssignedStation(res);
        }
    };

    if (fetchingAssigned) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 2 }}>
                <CircularProgress size={40} />
                <Typography color="textSecondary">Đang tải thông tin trạm bơm...</Typography>
            </Box>
        );
    }

    // CASE 1: Assigned to a specific station
    if (user?.assigned_pumping_station_id && assignedStation) {
        return (
            <Box sx={{ px: 2, pt: 2, pb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <IconTools size={28} color={theme.palette.primary.main} />
                    <Typography variant="h3" sx={{ fontWeight: 900 }}>Trạm bơm phụ trách</Typography>
                </Box>
                <PumpingStationReport station={assignedStation} onSuccess={handleRefreshAssigned} />
            </Box>
        );
    }

    // CASE 2: No specific assignment, show list
    return (
        <Box sx={{ px: 1.5, pt: 2, pb: 10 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h3" sx={{ fontWeight: 900, color: 'primary.main' }}>Trạm bơm</Typography>
                <Avatar sx={{ bgcolor: 'primary.lighter', width: 44, height: 44 }}>
                    <IconEngine size={24} color={theme.palette.primary.main} />
                </Avatar>
            </Box>

            {!user?.assigned_pumping_station_id && (
                <Alert icon={false} sx={{ mb: 3, borderRadius: 3, bgcolor: 'grey.50', border: '1px dashed', borderColor: 'divider' }}>
                    <AlertTitle sx={{ fontWeight: 800 }}>Bạn chưa được gán trạm cố định</AlertTitle>
                    Dưới đây là danh sách các trạm bơm trong khu vực quản lý.
                </Alert>
            )}

            <Stack spacing={1.5}>
                {loading ? (
                    [1, 2, 3].map(i => <Skeleton key={i} variant="rectangular" height={100} sx={{ borderRadius: 4 }} />)
                ) : pumpingStations.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 5 }}>
                        <Typography color="textSecondary">Không tìm thấy trạm bơm nào</Typography>
                    </Box>
                ) : (
                    pumpingStations.map(station => (
                        <PumpingStationCard key={station.id} station={station} navigate={navigate} basePath={basePath} />
                    ))
                )}
            </Stack>
        </Box>
    );
};

export default EmployeePumpingStationDashboard;
