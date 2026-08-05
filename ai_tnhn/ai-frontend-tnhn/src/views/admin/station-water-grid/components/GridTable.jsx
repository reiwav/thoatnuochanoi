import React from 'react';
import dayjs from 'dayjs';
import {
    Box, TableContainer, Table, TableHead, TableBody, TableRow, TableCell,
    Paper, CircularProgress, Typography, Stack, Chip, FormControlLabel, Switch
} from '@mui/material';
import PermissionGuard from 'ui-component/PermissionGuard';
import GridCellInput from './GridCellInput';
import useStickyTableHeader from '../hooks/useStickyTableHeader';

const getCellTextColor = (status) => {
    if (status === 'high') return 'error.main'; // Red
    if (status === 'low') return 'warning.dark'; // Orange
    return 'inherit'; // Normal text color
};

const toRoman = (num) => {
    const romanMap = [
        [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
    ];
    let res = '';
    for (let [val, char] of romanMap) {
        while (num >= val) {
            res += char;
            num -= val;
        }
    }
    return res || String(num);
};

const GridTable = ({
    loading,
    mode,
    flexibleSlots,
    groupedStations,
    gridValues,
    getCellThresholdStatus,
    activeEditOrgs,
    toggleOrgEditMode,
    handleCellChange,
    saveSingleCell
}) => {
    const { containerRef, theadRef, floatingRef } = useStickyTableHeader();

    return (
        <>
            {/* Floating header container - managed by useStickyTableHeader */}
            <div ref={floatingRef} style={{ display: 'none' }} />

            <TableContainer 
                ref={containerRef}
                component={Paper} 
                elevation={0} 
                sx={{
                    overflowX: 'auto',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '8px'
                }}
            >
                <Table size="small" sx={{ minWidth: 1200, borderCollapse: 'separate', borderSpacing: 0 }}>
                    <TableHead ref={theadRef}>
                    <TableRow>
                        <TableCell width={50} align="center" sx={{ fontWeight: 800, fontSize: '0.9rem', bgcolor: 'grey.50' }}>STT</TableCell>
                        <TableCell width={80} align="center" sx={{ fontWeight: 800, fontSize: '0.9rem', bgcolor: 'grey.50' }}>Old ID</TableCell>
                        <TableCell width={220} sx={{ fontWeight: 800, fontSize: '0.9rem', bgcolor: 'grey.50' }}>Tên trạm / Điểm đo</TableCell>

                        {mode === 'fixed' ? (
                            <>
                                <TableCell width={120} align="center" sx={{ fontWeight: 800, fontSize: '0.9rem', bgcolor: 'grey.50' }}>6h30</TableCell>
                                <TableCell width={120} align="center" sx={{ fontWeight: 800, fontSize: '0.9rem', bgcolor: 'grey.50' }}>13h30</TableCell>
                                <TableCell width={120} align="center" sx={{ fontWeight: 800, fontSize: '0.9rem', bgcolor: 'grey.50' }}>Hiện tại</TableCell>
                                <TableCell width={120} align="center" sx={{ fontWeight: 800, fontSize: '0.9rem', bgcolor: 'grey.50' }}>Chênh lệch</TableCell>
                            </>
                        ) : (
                            <>
                                <TableCell 
                                    width={125} 
                                    align="center"
                                    sx={{ 
                                        fontWeight: 800, 
                                        fontSize: '0.85rem',
                                        bgcolor: 'primary.50',
                                        color: 'primary.main',
                                        borderBottom: '2px solid',
                                        borderColor: 'primary.main'
                                    }}
                                >
                                    TG gần nhất
                                </TableCell>
                                {flexibleSlots.map(slot => (
                                    <TableCell 
                                        key={slot.key} 
                                        width={110} 
                                        align="center"
                                        sx={{ 
                                            fontWeight: 800, 
                                            fontSize: '0.9rem',
                                            bgcolor: 'grey.50',
                                            color: slot.isT0 ? 'primary.main' : 'text.primary',
                                            borderBottom: slot.isT0 ? '2px solid' : 'none',
                                            borderColor: 'primary.main'
                                        }}
                                    >
                                        <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
                                            <span>{slot.label}</span>
                                            {slot.isT0 && (
                                                <Chip label="T0" color="primary" size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 900, px: 0.2 }} />
                                            )}
                                        </Stack>
                                    </TableCell>
                                ))}
                            </>
                        )}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={15} align="center" sx={{ py: 5 }}>
                                <CircularProgress size={32} color="secondary" />
                                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>Đang tải danh sách trạm...</Typography>
                            </TableCell>
                        </TableRow>
                    ) : groupedStations.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={15} align="center" sx={{ py: 5 }}>
                                <Typography variant="body1" color="text.secondary">Không tìm thấy trạm phù hợp</Typography>
                            </TableCell>
                        </TableRow>
                    ) : (
                        groupedStations.map((group, gIdx) => {
                            const colSpanCount = mode === 'fixed' ? 7 : flexibleSlots.length + 4;
                            const isGroupEditing = !!activeEditOrgs?.[group.orgId];

                            return (
                                <React.Fragment key={group.orgId}>
                                    <TableRow>
                                        <TableCell 
                                            colSpan={colSpanCount} 
                                            sx={{ 
                                                bgcolor: isGroupEditing ? 'primary.light' : 'grey.100',
                                                borderTop: '1px solid',
                                                borderBottom: '1px solid',
                                                borderColor: isGroupEditing ? 'primary.main' : 'divider',
                                                py: 0.75,
                                                px: 2,
                                                transition: 'background-color 0.2s'
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: isGroupEditing ? 'primary.main' : 'grey.900', letterSpacing: '0.2px' }}>
                                                    {toRoman(gIdx + 1)}. {group.orgName}
                                                </Typography>

                                                <PermissionGuard permission="water:update">
                                                    <FormControlLabel
                                                        control={
                                                            <Switch
                                                                size="small"
                                                                checked={isGroupEditing}
                                                                onChange={() => toggleOrgEditMode(group.orgId)}
                                                                color="primary"
                                                            />
                                                        }
                                                        label={
                                                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isGroupEditing ? 'primary.main' : 'text.secondary', fontSize: '0.8rem' }}>
                                                                Nhập liệu {isGroupEditing ? '(BẬT)' : '(TẮT)'}
                                                            </Typography>
                                                        }
                                                        sx={{ m: 0 }}
                                                    />
                                                </PermissionGuard>
                                            </Box>
                                        </TableCell>
                                    </TableRow>

                                    {group.stations.map((st, idx) => {
                                        const oldId = st.OldId || st.old_id || st.Id || st.id;

                                        if (mode === 'fixed') {
                                            const v630 = gridValues[`${st.type}_${oldId}_6h30`] || '';
                                            const id630 = gridValues[`${st.type}_${oldId}_6h30_id`] || '';
                                            const v1330 = gridValues[`${st.type}_${oldId}_13h30`] || '';
                                            const id1330 = gridValues[`${st.type}_${oldId}_13h30_id`] || '';
                                            const vNow = gridValues[`${st.type}_${oldId}_now`] || '';
                                            const idNow = gridValues[`${st.type}_${oldId}_now_id`] || '';

                                            const st630 = getCellThresholdStatus(st, '6h30', v630);
                                            const st1330 = getCellThresholdStatus(st, '13h30', v1330);
                                            const stNow = getCellThresholdStatus(st, 'now', vNow);

                                            let diffText = '-';
                                            if (v1330 !== '' && v1330 !== undefined && v630 !== '' && v630 !== undefined && !isNaN(parseFloat(v1330)) && !isNaN(parseFloat(v630))) {
                                                const rawDiff = parseFloat(v1330) - parseFloat(v630);
                                                const cleanDiff = Math.round(rawDiff * 100) / 100;
                                                diffText = cleanDiff > 0 ? `+${cleanDiff}` : `${cleanDiff}`;
                                            }

                                            return (
                                                <TableRow key={st.id || idx} hover>
                                                    <TableCell align="center" sx={{ fontWeight: 700 }}>{idx + 1}</TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 700, color: 'text.secondary' }}>{oldId}</TableCell>
                                                    <TableCell sx={{ fontWeight: 800, color: 'primary.main' }}>{st.TenTram || st.ten_tram}</TableCell>

                                                    <GridCellInput
                                                        value={v630}
                                                        onChange={(val) => handleCellChange(st.type, oldId, '6h30', val)}
                                                        onBlur={(val) => saveSingleCell(st, '6h30', val, id630)}
                                                        status={st630}
                                                        isGroupEditing={isGroupEditing}
                                                    />

                                                    <GridCellInput
                                                        value={v1330}
                                                        onChange={(val) => handleCellChange(st.type, oldId, '13h30', val)}
                                                        onBlur={(val) => saveSingleCell(st, '13h30', val, id1330)}
                                                        status={st1330}
                                                        isGroupEditing={isGroupEditing}
                                                    />

                                                    <GridCellInput
                                                        value={vNow}
                                                        onChange={(val) => handleCellChange(st.type, oldId, 'now', val)}
                                                        onBlur={(val) => saveSingleCell(st, 'now', val, idNow)}
                                                        status={stNow}
                                                        isGroupEditing={isGroupEditing}
                                                    />

                                                    <TableCell align="center" sx={{ fontWeight: 700, color: diffText.startsWith('+') ? 'error.main' : (diffText !== '-' ? 'success.main' : 'inherit') }}>
                                                        {diffText}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        } else {
                                            const vNow = gridValues[`${st.type}_${oldId}_now`] || '';
                                            const nowTimeStr = gridValues[`${st.type}_${oldId}_nowTime`] || '';
                                            const stNow = getCellThresholdStatus(st, 'now', vNow);
                                            const timeLabel = nowTimeStr ? dayjs(nowTimeStr).format('HH:mm') : '';

                                            return (
                                                <TableRow key={st.id || idx} hover>
                                                    <TableCell align="center" sx={{ fontWeight: 700 }}>{idx + 1}</TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 700, color: 'text.secondary' }}>{oldId}</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>{st.TenTram || st.ten_tram}</TableCell>

                                                    <GridCellInput
                                                        value={vNow}
                                                        timeLabel={timeLabel}
                                                        onChange={(val) => handleCellChange(st.type, oldId, 'now', val)}
                                                        onBlur={(val) => saveSingleCell(st, 'now', val, idNow)}
                                                        status={stNow}
                                                        isT0={true}
                                                        isGroupEditing={isGroupEditing}
                                                    />

                                                    {flexibleSlots.map(slot => {
                                                        const key = `${st.type}_${oldId}_${slot.key}`;
                                                        const val = gridValues[key] || '';
                                                        const idVal = gridValues[`${key}_id`] || '';
                                                        const stStatus = getCellThresholdStatus(st, slot.key, val);

                                                        return (
                                                            <GridCellInput
                                                                key={slot.key}
                                                                value={val}
                                                                onChange={(newVal) => handleCellChange(st.type, oldId, slot.key, newVal)}
                                                                onBlur={(finalVal) => saveSingleCell(st, slot.key, finalVal, idVal)}
                                                                status={stStatus}
                                                                isT0={slot.isT0}
                                                                isGroupEditing={isGroupEditing}
                                                            />
                                                        );
                                                    })}
                                                </TableRow>
                                            );
                                        }
                                    })}
                                </React.Fragment>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </TableContainer>
        </>
    );
};

export default GridTable;
