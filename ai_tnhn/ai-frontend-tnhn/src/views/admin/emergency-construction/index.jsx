import { Box, Typography, Stack } from '@mui/material';
import { IconAlertTriangle } from '@tabler/icons-react';
import MainCard from 'ui-component/cards/MainCard';
import ConstructionList from './ConstructionList';

const EmergencyConstruction = () => {
    return (
        <MainCard 
            title={
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <IconAlertTriangle size={24} color="#f44336" />
                        <Typography variant="h3" sx={{ fontWeight: 800 }}>BC CT KC</Typography>
                    </Stack>
                </Box>
            }
        >
            <Box sx={{ width: '100%' }}>
                <Box sx={{ p: 3 }}>
                    <ConstructionList />
                </Box>
            </Box>
        </MainCard>
    );
};

export default EmergencyConstruction;
