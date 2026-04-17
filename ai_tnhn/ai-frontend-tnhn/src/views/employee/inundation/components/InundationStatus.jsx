import React from 'react';
import { Chip, Stack } from '@mui/material';
import { getTrafficStatusColor, getTrafficStatusLabel } from 'utils/trafficStatusHelper';

const InundationStatus = ({ reportId, latest, isReviewUpdated, needsCorrection }) => {
    return (
        <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
            <Chip
                label={reportId ? 'Đang ngập' : 'Bình thường'}
                color={reportId ? 'error' : 'success'}
                size="small"
                sx={{ fontWeight: 800 }}
            />
            {reportId && latest?.traffic_status && (
                <Chip
                    label={getTrafficStatusLabel(latest.traffic_status)}
                    size="small"
                    color={getTrafficStatusColor(latest.traffic_status)}
                    variant="outlined"
                    sx={{ fontWeight: 800 }}
                />
            )}
            {isReviewUpdated && (
                <Chip
                    label="ĐÃ SỬA"
                    size="small"
                    sx={{
                        fontWeight: 900,
                        color: 'white',
                        bgcolor: 'success.main',
                        fontSize: '0.65rem',
                        height: 20
                    }}
                />
            )}
            {needsCorrection && (
                <Chip
                    label="CẦN SỬA"
                    size="small"
                    color="error"
                    sx={{
                        fontWeight: 900,
                        animation: 'blink 1s infinite',
                        border: '1px solid white'
                    }}
                />
            )}
            <style>{`
                @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
            `}</style>
        </Stack>
    );
};

export default InundationStatus;
