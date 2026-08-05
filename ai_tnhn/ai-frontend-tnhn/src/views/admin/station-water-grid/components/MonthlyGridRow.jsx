import React from 'react';
import { TableRow, TableCell, Box, Typography } from '@mui/material';
import MonthlyGridCellInput from './MonthlyGridCellInput';
import PermissionGuard from 'ui-component/PermissionGuard';

const MonthlyGridRow = React.memo(({ day, flatStations, gridData, saveSingleCell }) => {
    return (
        <TableRow hover>
            <TableCell 
                align="center" 
                sx={{ 
                    fontWeight: 800, 
                    bgcolor: 'background.paper',
                    borderRight: '1px solid',
                    borderColor: 'divider',
                    position: 'sticky',
                    left: 0,
                    zIndex: 1
                }}
            >
                {day}
            </TableCell>
            {flatStations.map(st => {
                const oldId = st.OldId || st.old_id || st.Id || st.id;
                const val6_30 = gridData[`${st.type}_${oldId}_${day}_6h30`];
                const id6_30 = gridData[`${st.type}_${oldId}_${day}_6h30_id`];
                const val13 = gridData[`${st.type}_${oldId}_${day}_13h30`];
                const id13 = gridData[`${st.type}_${oldId}_${day}_13h30_id`];

                return (
                    <TableCell 
                        key={st.id || oldId} 
                        align="center"
                        sx={{ 
                            borderRight: '1px solid',
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            p: 0.5,
                            bgcolor: (day % 2 === 0) ? 'rgba(0,0,0,0.02)' : 'background.paper'
                        }}
                    >
                        <PermissionGuard permission="water:update" fallback={
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                <Typography variant="body2" fontWeight={700}>{val6_30 !== undefined ? val6_30 : '-'}</Typography>
                                <Typography variant="body2" fontWeight={700}>{val13 !== undefined ? val13 : '-'}</Typography>
                            </Box>
                        }>
                            <MonthlyGridCellInput 
                                station={st}
                                day={day}
                                saveSingleCell={saveSingleCell}
                                value6_30={val6_30}
                                id6_30={id6_30}
                                value13={val13}
                                id13={id13}
                            />
                        </PermissionGuard>
                    </TableCell>
                );
            })}
        </TableRow>
    );
});

export default MonthlyGridRow;
