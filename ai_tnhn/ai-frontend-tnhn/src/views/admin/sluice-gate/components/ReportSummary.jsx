import React from 'react';
import { Stack, Box, Typography } from '@mui/material';
import { IconClock, IconUser } from '@tabler/icons-react';
import dayjs from 'dayjs';

const ReportSummary = ({ lastReport }) => {
    if (!lastReport) return null;
    return (
        <Stack spacing={1}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconClock size={14} color="gray" />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    {dayjs(lastReport.timestamp * 1000).format('DD/MM/YYYY HH:mm')}
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconUser size={14} color="gray" />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>{lastReport.user_name}</Typography>
            </Box>
            <Typography variant="body2" sx={{ mt: 1, p: 1, bgcolor: 'white', borderRadius: 1, border: '1px solid', borderColor: 'divider', fontStyle: 'italic' }}>
                {lastReport.note}
            </Typography>
        </Stack>
    );
};

export default ReportSummary;
