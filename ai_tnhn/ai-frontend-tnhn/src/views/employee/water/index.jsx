import React, { useState } from 'react';
import {
    Box,
    CircularProgress,
    Typography,
    Container,
    Tabs,
    Tab,
    IconButton
} from '@mui/material';
import { IconRefresh } from '@tabler/icons-react';

import MainCard from 'ui-component/cards/MainCard';
import useEmployeeWater from './hooks/useEmployeeWater';
import StationReportCard from './components/StationReportCard';

const EmployeeWaterPage = () => {
    const {
        lakes,
        rivers,
        latestReadings,
        loading,
        refresh
    } = useEmployeeWater();

    const [tabValue, setTabValue] = useState(0);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    const assignedLakesCount = lakes.length;
    const assignedRiversCount = rivers.length;

    return (
        <Container maxWidth="md" sx={{ mt: { xs: 1.5, sm: 3 }, px: { xs: 1.5, sm: 3 }, pb: 4 }}>
            <MainCard
                title={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h3" sx={{ fontWeight: 800 }}>Mực nước Sông Hồ</Typography>
                        <IconButton onClick={refresh} size="medium" color="primary">
                            <IconRefresh size={22} />
                        </IconButton>
                    </Box>
                }
                sx={{
                    borderRadius: '24px',
                    boxShadow: 'none',
                    border: '1px solid',
                    borderColor: 'divider'
                }}
            >
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    variant="fullWidth"
                    indicatorColor="primary"
                    textColor="primary"
                    sx={{
                        mb: 2,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '& .MuiTab-root': { fontWeight: 700, fontSize: '0.95rem', py: 1.5 }
                    }}
                >
                    <Tab label={`Hồ (${assignedLakesCount})`} />
                    <Tab label={`Sông (${assignedRiversCount})`} />
                </Tabs>

                {tabValue === 0 ? (
                    // LAKES TAB
                    assignedLakesCount === 0 ? (
                        <Box sx={{ py: 6, textAlign: 'center' }}>
                            <Typography variant="h5" color="text.secondary" sx={{ fontWeight: 600, mb: 1 }}>
                                Không có hồ nào được gán
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Bạn chưa được phân công quản lý mực nước hồ nào.
                            </Typography>
                        </Box>
                    ) : (
                        lakes.map(lake => (
                            <StationReportCard
                                key={lake.id}
                                station={lake}
                                type="lake"
                                latestReading={latestReadings[lake.OldId ?? lake.old_id ?? lake.OldID]}
                                onReportSuccess={refresh}
                            />
                        ))
                    )
                ) : (
                    // RIVERS TAB
                    assignedRiversCount === 0 ? (
                        <Box sx={{ py: 6, textAlign: 'center' }}>
                            <Typography variant="h5" color="text.secondary" sx={{ fontWeight: 600, mb: 1 }}>
                                Không có sông nào được gán
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Bạn chưa được phân công quản lý mực nước sông nào.
                            </Typography>
                        </Box>
                    ) : (
                        rivers.map(river => (
                            <StationReportCard
                                key={river.id}
                                station={river}
                                type="river"
                                latestReading={latestReadings[river.OldId ?? river.old_id ?? river.OldID]}
                                onReportSuccess={refresh}
                            />
                        ))
                    )
                )}
            </MainCard>
        </Container>
    );
};

export default EmployeeWaterPage;
