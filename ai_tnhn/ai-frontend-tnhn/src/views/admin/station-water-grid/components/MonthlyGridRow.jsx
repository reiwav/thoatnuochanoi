import React from 'react';
import { TableRow, TableCell, Box, Typography, IconButton, Tooltip } from '@mui/material';
import { IconEdit, IconCheck } from '@tabler/icons-react';
import dayjs from 'dayjs';
import MonthlyGridCellInput from './MonthlyGridCellInput';
import PermissionGuard from 'ui-component/PermissionGuard';
import { calculateThresholdStatus, getReadOnlyCellColor, getStationId } from '../utils/gridHelpers';

const MonthlyGridRow = React.memo(({ day, flatStations, gridData, saveSingleCell, selectedMonth, activeSetting, activeEditDays, toggleDayEditMode }) => {
    const now = dayjs();
    const isCurrentMonth = selectedMonth ? selectedMonth.isSame(now, 'month') : false;
    const isToday = isCurrentMonth && day === now.date();
    
    // The user rule: "các ngày quá khứ phải thêm nút switch sửa cùng ô với từng ngày. Ngày hiện tại thì luôn cho nhập."
    const requiresSwitch = !isToday;
    const isEditing = isToday || !!activeEditDays[day];

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
                    zIndex: 1,
                    p: 0.5
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body1" sx={{ fontWeight: 800 }}>{day}</Typography>
                    {requiresSwitch && (
                        <PermissionGuard permission="water:update">
                            <Tooltip title={isEditing ? "Hoàn tất sửa" : "Sửa dữ liệu"}>
                                <IconButton 
                                    size="small" 
                                    onClick={() => toggleDayEditMode(day)}
                                    color={isEditing ? "success" : "primary"}
                                    sx={{ 
                                        bgcolor: isEditing ? 'success.light' : 'primary.lighter',
                                        color: isEditing ? 'success.dark' : 'primary.main',
                                        '&:hover': { bgcolor: isEditing ? 'success.main' : 'primary.light', color: isEditing ? '#fff' : 'primary.dark' }
                                    }}
                                >
                                    {isEditing ? <IconCheck size={16} /> : <IconEdit size={16} />}
                                </IconButton>
                            </Tooltip>
                        </PermissionGuard>
                    )}
                </Box>
            </TableCell>
            {flatStations.map(st => {
                const oldId = getStationId(st);
                const val6_30 = gridData[`${st.type}_${oldId}_${day}_6h30`];
                const id6_30 = gridData[`${st.type}_${oldId}_${day}_6h30_id`];
                const val13 = gridData[`${st.type}_${oldId}_${day}_13h30`];
                const id13 = gridData[`${st.type}_${oldId}_${day}_13h30_id`];

                const targetDate = selectedMonth ? selectedMonth.date(day) : null;
                const status6_30 = calculateThresholdStatus(st, val6_30, targetDate, activeSetting);
                const status13 = calculateThresholdStatus(st, val13, targetDate, activeSetting);

                const hasVal6_30 = val6_30 !== undefined && val6_30 !== null && val6_30 !== '';
                const hasVal13 = val13 !== undefined && val13 !== null && val13 !== '';

                const fallbackContent = (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, py: 0.5 }}>
                        <Typography variant="body2" fontWeight={700} sx={{ color: getReadOnlyCellColor(status6_30, hasVal6_30) }}>
                            {hasVal6_30 ? val6_30 : '-'}
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ color: getReadOnlyCellColor(status13, hasVal13) }}>
                            {hasVal13 ? val13 : '-'}
                        </Typography>
                    </Box>
                );

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
                        {isEditing ? (
                            <PermissionGuard permission="water:update" fallback={fallbackContent}>
                                <MonthlyGridCellInput
                                    station={st}
                                    day={day}
                                    saveSingleCell={saveSingleCell}
                                    value6_30={val6_30}
                                    id6_30={id6_30}
                                    value13={val13}
                                    id13={id13}
                                    selectedMonth={selectedMonth}
                                    activeSetting={activeSetting}
                                />
                            </PermissionGuard>
                        ) : fallbackContent}
                    </TableCell>
                );
            })}
        </TableRow>
    );
});

export default MonthlyGridRow;
