import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Stack, IconButton, Container
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconArrowLeft } from '@tabler/icons-react';

// project imports
import InundationHistoryView from '../../shared/inundation/InundationHistoryView';

const InundationHistoryDetail = () => {
    const theme = useTheme();
    const navigate = useNavigate();

    return (
        <Box sx={{ py: 2, pb: 10, bgcolor: 'grey.50', minHeight: '100vh' }}>
            <Container maxWidth="lg" sx={{ px: { xs: 1.5, sm: 3 } }}>
                {/* Mobile Header / Nav */}
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
                    <IconButton 
                        onClick={() => navigate(-1)} 
                        sx={{ 
                            bgcolor: 'white', 
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            '&:hover': { bgcolor: 'grey.100' }
                        }}
                    >
                        <IconArrowLeft size={20} />
                    </IconButton>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
                        Chi tiết lịch sử
                    </Typography>
                </Stack>

                {/* Using the shared responsive timeline view */}
                <InundationHistoryView />
            </Container>
        </Box>
    );
};

export default InundationHistoryDetail;
