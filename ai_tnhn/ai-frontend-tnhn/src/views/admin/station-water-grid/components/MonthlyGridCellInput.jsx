import React from 'react';
import { Box } from '@mui/material';
import InlineEditNumber from 'views/shared/InlineEditNumber';

const MonthlyGridCellInput = React.memo(({ station, day, value6_30, id6_30, value13, id13, saveSingleCell }) => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center', justifyContent: 'center' }}>
            <InlineEditNumber 
                value={value6_30} 
                placeholder="6h30" 
                onSave={(val) => saveSingleCell(station, day, '6h30', val, id6_30)} 
                px={1}
                py={0.3}
                minWidth="50px"
            />
            <InlineEditNumber 
                value={value13} 
                placeholder="13h30" 
                onSave={(val) => saveSingleCell(station, day, '13h30', val, id13)} 
                px={1}
                py={0.3}
                minWidth="50px"
            />
        </Box>
    );
});

export default MonthlyGridCellInput;
