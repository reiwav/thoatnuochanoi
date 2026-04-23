import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Stack, Avatar, Skeleton, CircularProgress,
    Alert, AlertTitle, Paper, Button, useMediaQuery, Grid, TextField
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconEngine, IconEdit, IconCheck, IconSearch } from '@tabler/icons-react';

import useAuthStore from 'store/useAuthStore';
import usePumpingStationStore from 'store/usePumpingStationStore';
import pumpingStationApi from 'api/pumpingStation';

// Components
import EmployeeActionDialog from '../components/EmployeeActionDialog';
import PumpingStationCard from './components/PumpingStationCard';

const EmployeePumpingStationDashboard = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { pumpingStations, loading, fetchPumpingStations } = usePumpingStationStore();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [assignedStation, setAssignedStation] = useState(null);
    const [fetchingAssigned, setFetchingAssigned] = useState(false);
    const [taskDialog, setTaskDialog] = useState({ open: false, data: null });

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
                fetchPumpingStations();
            }
        };
        fetchAssigned();
    }, [user?.assigned_pumping_station_id]);

    // Polling
    useEffect(() => {
        if (!user?.assigned_pumping_station_id) {
            const interval = setInterval(() => {
                fetchPumpingStations();
            }, 10000);
            return () => clearInterval(interval);
        }
    }, [user?.assigned_pumping_station_id]);

    const handleRefresh = () => {
        if (user?.assigned_pumping_station_id) {
            pumpingStationApi.get(user.assigned_pumping_station_id).then(setAssignedStation);
        } else {
            fetchPumpingStations();
        }
    };

    const filteredStations = useMemo(() => {
        if (!searchQuery.trim()) return pumpingStations;
        const q = searchQuery.toLowerCase();
        return pumpingStations.filter(s => s.name?.toLowerCase().includes(q) || s.address?.toLowerCase().includes(q));
    }, [pumpingStations, searchQuery]);

    if (fetchingAssigned) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 2 }}>
                <CircularProgress size={40} />
                <Typography color="textSecondary">Đang tải thông tin trạm bơm...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ px: 1.5, pt: 2, pb: 10 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h3" sx={{ fontWeight: 900, color: 'primary.main' }}>Trạm bơm</Typography>
                <Avatar sx={{ bgcolor: 'primary.lighter', width: 44, height: 44 }}>
                    <IconEngine size={24} color={theme.palette.primary.main} />
                </Avatar>
            </Box>

            {/* Filter Bar */}
            {!user?.assigned_pumping_station_id && (
                <Box sx={{ mb: 2 }}>
                    <TextField
                        fullWidth
                        placeholder="Tìm tên trạm, khu vực..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        slotProps={{
                            input: {
                                startAdornment: <IconSearch size={20} style={{ marginRight: 12, opacity: 0.6 }} />,
                                sx: {
                                    borderRadius: 4,
                                    bgcolor: 'background.paper',
                                    boxShadow: theme.shadows[1],
                                    '&:hover': { boxShadow: theme.shadows[3] },
                                    '& .MuiOutlinedInput-notchedOutline': { border: '1px solid', borderColor: 'divider' }
                                }
                            }
                        }}
                    />
                </Box>
            )}

            {user?.assigned_pumping_station_id && assignedStation ? (
                <Stack spacing={2}>
                    <Alert severity="success" icon={<IconCheck size={20} />} sx={{ borderRadius: 3, fontWeight: 700 }}>
                        Trạm bơm phụ trách cố định
                    </Alert>
                    <PumpingStationCard station={assignedStation} onUpdate={(s) => setTaskDialog({ open: true, data: s })} />
                </Stack>
            ) : (
                <Box>
                    <Alert icon={false} sx={{ mb: 2, borderRadius: 3, bgcolor: 'grey.50', border: '1px dashed', borderColor: 'divider' }}>
                        <AlertTitle sx={{ fontWeight: 800 }}>Chưa được gán trạm cố định</AlertTitle>
                        Danh sách các trạm bơm trong khu vực quản lý.
                    </Alert>
                    
                    {loading ? (
                        <Grid container spacing={2}>
                            {[1, 2, 3].map(i => (
                                <Grid item xs={12} sm={6} key={i}>
                                    <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 4 }} />
                                </Grid>
                            ))}
                        </Grid>
                    ) : filteredStations.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 8 }}>
                            <Typography variant="h4" color="textSecondary" sx={{ mb: 1, fontWeight: 700 }}>Không tìm thấy trạm bơm</Typography>
                            <Typography variant="body2" color="textSecondary">Hãy thử tìm kiếm với từ khóa khác</Typography>
                        </Box>
                    ) : (
                        <Grid container spacing={2}>
                            {filteredStations.map(station => (
                                <Grid item xs={12} sm={6} key={station.id}>
                                    <PumpingStationCard 
                                        station={station} 
                                        onUpdate={(s) => setTaskDialog({ open: true, data: s })} 
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </Box>
            )}

            <EmployeeActionDialog 
                open={taskDialog.open}
                mode="PUMPING"
                data={taskDialog.data}
                onClose={() => setTaskDialog({ ...taskDialog, open: false })}
                onFinished={() => {
                    setTaskDialog({ ...taskDialog, open: false });
                    handleRefresh();
                }}
            />
        </Box>
    );
};

export default EmployeePumpingStationDashboard;
