import React from 'react';
import { Box } from '@mui/material';
import useHistoryDrillDown from '../hooks/useHistoryDrillDown';
import HistoryHeader from './history/HistoryHeader';
import HistoryTable from './history/HistoryTable';
import HistoryPagination from './history/HistoryPagination';

const HistoryDrillDown = ({ station, onBack }) => {
    const {
        history,
        total,
        page,
        setPage,
        loading,
        perPage,
        refetch
    } = useHistoryDrillDown({ station });

    const isPumping = station?.pump_count !== undefined;

    return (
        <Box sx={{ mt: 1 }}>
            <HistoryHeader 
                station={station} 
                isPumping={isPumping} 
                loading={loading} 
                onBack={onBack} 
                onRefresh={refetch} 
            />

            <HistoryTable 
                history={history} 
                isPumping={isPumping} 
                loading={loading} 
            />

            <HistoryPagination 
                total={total} 
                page={page} 
                perPage={perPage} 
                onPageChange={setPage} 
            />
        </Box>
    );
};

export default HistoryDrillDown;
