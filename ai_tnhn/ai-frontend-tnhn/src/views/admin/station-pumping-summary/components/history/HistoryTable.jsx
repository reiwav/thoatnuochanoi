import React from 'react';
import { 
    Table, TableBody, TableContainer, Paper 
} from '@mui/material';
import HistoryTableHead from './HistoryTableHead';
import HistoryTableRow from './HistoryTableRow';
import HistorySkeleton from './HistorySkeleton';
import HistoryEmptyState from './HistoryEmptyState';

const HistoryTable = ({ history = [], isPumping, loading }) => {
    const colSpan = isPumping ? 7 : 3;

    return (
        <TableContainer 
            component={Paper} 
            elevation={0}
            sx={{ 
                borderRadius: 3, 
                border: '1px solid', 
                borderColor: 'divider',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                overflow: 'hidden'
            }}
        >
            <Table sx={{ minWidth: isPumping ? 750 : 550 }} size="medium">
                <HistoryTableHead isPumping={isPumping} />
                <TableBody>
                    {loading ? (
                        <HistorySkeleton isPumping={isPumping} rowCount={5} />
                    ) : history.length > 0 ? (
                        history.map((row, index) => (
                            <HistoryTableRow 
                                key={row.id || index} 
                                row={row} 
                                isPumping={isPumping} 
                            />
                        ))
                    ) : (
                        <HistoryEmptyState colSpan={colSpan} />
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default HistoryTable;
