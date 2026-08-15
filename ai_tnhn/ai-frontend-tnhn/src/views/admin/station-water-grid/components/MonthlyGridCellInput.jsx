import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import InlineEditNumber from 'views/shared/InlineEditNumber';
import { calculateThresholdStatus, getCellTextColor } from '../utils/gridHelpers';

const MonthlyGridCellInput = React.memo(({ station, day, value6_30, id6_30, value13, id13, saveSingleCell, selectedMonth, activeSetting }) => {
    const [currentVal6_30, setCurrentVal6_30] = useState(value6_30);
    const [currentVal13, setCurrentVal13] = useState(value13);

    useEffect(() => {
        setCurrentVal6_30(value6_30);
    }, [value6_30]);

    useEffect(() => {
        setCurrentVal13(value13);
    }, [value13]);

    const targetDate = selectedMonth ? selectedMonth.date(day) : null;
    const status6_30 = calculateThresholdStatus(station, currentVal6_30, targetDate, activeSetting);
    const status13 = calculateThresholdStatus(station, currentVal13, targetDate, activeSetting);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center', justifyContent: 'center' }}>
            <InlineEditNumber 
                value={value6_30} 
                placeholder="6h30" 
                onChange={(val) => setCurrentVal6_30(val)}
                onSave={(val) => {
                    setCurrentVal6_30(val);
                    saveSingleCell(station, day, '6h30', val, id6_30);
                }} 
                textColor={getCellTextColor(status6_30)}
                px={1}
                py={0.3}
                minWidth="50px"
            />
            <InlineEditNumber 
                value={value13} 
                placeholder="13h30" 
                onChange={(val) => setCurrentVal13(val)}
                onSave={(val) => {
                    setCurrentVal13(val);
                    saveSingleCell(station, day, '13h30', val, id13);
                }} 
                textColor={getCellTextColor(status13)}
                px={1}
                py={0.3}
                minWidth="50px"
            />
        </Box>
    );
});

export default MonthlyGridCellInput;
