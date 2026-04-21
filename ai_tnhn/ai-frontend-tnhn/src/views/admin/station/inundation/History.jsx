import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Box, Stack, Typography, FormControl, InputLabel, 
    Select, MenuItem, Paper, alpha
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import stationApi from 'api/station';
import InundationHistoryView from '../../../../shared/inundation/InundationHistoryView';

const InundationStationHistory = () => {
    const theme = useTheme();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialPointId = searchParams.get('id');

    const [points, setPoints] = useState([]);
    const [selectedPoint, setSelectedPoint] = useState(initialPointId || '');

    const loadPoints = useCallback(async () => {
        try {
            const res = await stationApi.inundation.getAll();
            // stationApi likely also has an interceptor
            const data = Array.isArray(res) ? res : (res.data || []);
            setPoints(data);
            if (!selectedPoint && data.length > 0) {
                const firstId = data[0].id;
                setSelectedPoint(firstId);
                setSearchParams({ id: firstId });
            }
        } catch (err) {
            console.error('Failed to load points:', err);
        }
    }, [selectedPoint, setSearchParams]);

    useEffect(() => {
        loadPoints();
    }, [loadPoints]);

    const handlePointChange = (event) => {
        const id = event.target.value;
        setSelectedPoint(id);
        setSearchParams({ id });
    };

    return (
        <MainCard 
            title={
                <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.main' }}>
                    LỊCH SỬ ĐIỂM NGẬP ÚNG
                </Typography>
            }
        >
            <Stack spacing={3}>
                <Box sx={{ maxWidth: 400 }}>
                    <FormControl fullWidth>
                        <InputLabel>Chọn điểm ngập</InputLabel>
                        <Select
                            value={selectedPoint}
                            label="Chọn điểm ngập"
                            onChange={handlePointChange}
                            sx={{ borderRadius: 3, fontWeight: 700 }}
                        >
                            {points.map((p) => (
                                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                <Divider sx={{ opacity: 0.6 }} />

                {/* Injecting the shared timeline view here */}
                <Box sx={{ bgcolor: alpha(theme.palette.grey[50], 0.5), p: 2, borderRadius: 4 }}>
                    <InundationHistoryView pointId={selectedPoint} hideHeader={true} />
                </Box>
            </Stack>
        </MainCard>
    );
};

// Internal Divider for cleaner UI
const Divider = ({ sx }) => <Box sx={{ height: '1px', width: '100%', bgcolor: 'divider', ...sx }} />;

export default InundationStationHistory;
