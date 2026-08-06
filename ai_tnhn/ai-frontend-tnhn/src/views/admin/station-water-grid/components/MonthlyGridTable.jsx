import React from 'react';
import {
    Box, TableContainer, Table, TableHead, TableBody, TableRow, TableCell,
    Paper, CircularProgress, Typography
} from '@mui/material';
import MonthlyGridRow from './MonthlyGridRow';
import useStickyTableHeader from '../hooks/useStickyTableHeader';

const PASTEL_COLORS = [
    '#bbdefb', // 0: blue
    '#ffcc80', // 1: orange
    '#fff59d', // 2: yellow
    '#c8e6c9', // 3: green
    '#f8bbd0', // 4: pink
    '#e1bee7', // 5: purple
    '#dcedc8', // 6: light green
    '#b2dfdb', // 7: teal
    '#ffecb3', // 8: amber
    '#ffccbc', // 9: deep orange
];

const getThresholdStr = (st, seasonType) => {
    const configs = st?.threshold_configs || [];
    const cfg = configs.find(c => c.threshold_type === seasonType);
    if (!cfg) return '';
    if (cfg.max_level > 0 && cfg.min_level > 0) return `${cfg.min_level}-${cfg.max_level}`;
    if (cfg.max_level > 0) return `≤ ${cfg.max_level}`;
    if (cfg.min_level > 0) return `≥ ${cfg.min_level}`;
    return '';
};

const MonthlyGridTable = ({
    loading,
    daysInMonth,
    groupedStations,
    gridData,
    saveSingleCell
}) => {
    const { containerRef, theadRef, floatingRef } = useStickyTableHeader();

    // Generate a flat list of all stations to easily render the bottom rows (MNKC, MM, MK)
    let stationCounter = 1;
    const flatStations = [];
    groupedStations.forEach((group, idx) => {
        const bgColor = PASTEL_COLORS[idx % PASTEL_COLORS.length];
        group.stations.forEach(st => {
            flatStations.push({
                ...st,
                bgColor,
                mnkcIndex: stationCounter++
            });
        });
    });

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
                        {/* Row 1: XN and Group IDs */}
                        <TableRow>
                            <TableCell 
                                align="center" 
                                sx={{ 
                                    fontWeight: 800, fontSize: '0.85rem', bgcolor: 'grey.100',
                                    borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'divider',
                                    minWidth: 80, zIndex: 10, left: 0, position: 'sticky'
                                }}
                            >
                                XN
                            </TableCell>
                            {groupedStations.map((group, idx) => (
                                group.stations.map((st, i) => (
                                    <TableCell 
                                        key={`xn_${st.id || st.OldId}_${i}`} 
                                        align="center"
                                        sx={{ 
                                            fontWeight: 800, fontSize: '0.85rem', color: '#000',
                                            bgcolor: PASTEL_COLORS[idx % PASTEL_COLORS.length],
                                            borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'rgba(0,0,0,0.1)',
                                            p: 0.5
                                        }}
                                    >
                                        {group.orgId === 'unassigned' ? '-' : idx + 1}
                                    </TableCell>
                                ))
                            ))}
                        </TableRow>

                        {/* Row 2: Organization Names (colspan) */}
                        <TableRow>
                            <TableCell 
                                align="center" 
                                sx={{ 
                                    bgcolor: 'grey.100',
                                    borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'divider',
                                    zIndex: 10, left: 0, position: 'sticky'
                                }}
                            >
                            </TableCell>
                            {groupedStations.map((group, idx) => (
                                <TableCell 
                                    key={`org_${group.orgId || idx}`} 
                                    colSpan={group.stations.length}
                                    align="center"
                                    sx={{ 
                                        fontWeight: 800, fontSize: '0.85rem', color: '#000',
                                        bgcolor: 'background.paper',
                                        borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'rgba(0,0,0,0.1)',
                                        py: 1
                                    }}
                                >
                                    {group.orgName}
                                </TableCell>
                            ))}
                        </TableRow>

                        {/* Row 3: NGÀY and Station Names */}
                        <TableRow>
                            <TableCell 
                                align="center" 
                                sx={{ 
                                    fontWeight: 800, fontSize: '0.9rem', bgcolor: 'grey.100',
                                    borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'divider',
                                    zIndex: 10, left: 0, position: 'sticky'
                                }}
                            >
                                NGÀY
                            </TableCell>
                            {flatStations.map(st => (
                                <TableCell 
                                    key={`name_${st.id || st.OldId}`} 
                                    align="center"
                                    sx={{ 
                                        fontWeight: 800, fontSize: '0.85rem', color: '#000',
                                        bgcolor: st.bgColor,
                                        borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'rgba(0,0,0,0.1)',
                                        minWidth: 80, p: 1
                                    }}
                                >
                                    <Box sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100, whiteSpace: 'normal', lineHeight: 1.2 }}>
                                        {st.TenTram || st.ten_tram}
                                    </Box>
                                    <Typography variant="caption" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100, whiteSpace: 'normal', lineHeight: 1.2, color: 'text.secondary', fontSize: '0.7rem', mt: 0.5, fontWeight: 500 }}>
                                        {st.DiaChi || st.dia_chi || st.address || ''}
                                    </Typography>
                                </TableCell>
                            ))}
                        </TableRow>

                        {/* Row 4: MNKC and Indexes */}
                        <TableRow>
                            <TableCell 
                                align="center" 
                                sx={{ 
                                    fontWeight: 800, fontSize: '0.85rem', bgcolor: 'grey.100',
                                    borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'divider',
                                    zIndex: 10, left: 0, position: 'sticky'
                                }}
                            >
                                MNKC
                            </TableCell>
                            {flatStations.map(st => (
                                <TableCell 
                                    key={`mnkc_${st.id || st.OldId}`} 
                                    align="center"
                                    sx={{ 
                                        fontWeight: 800, fontSize: '0.85rem', color: '#000',
                                        bgcolor: 'background.paper',
                                        borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'rgba(0,0,0,0.1)',
                                        p: 0.5
                                    }}
                                >
                                    {st.mnkcIndex}
                                </TableCell>
                            ))}
                        </TableRow>

                        {/* Row 5: MM (Mùa Mưa) thresholds */}
                        <TableRow>
                            <TableCell 
                                align="center" 
                                sx={{ 
                                    fontWeight: 800, fontSize: '0.85rem', bgcolor: 'grey.100',
                                    borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'divider',
                                    zIndex: 10, left: 0, position: 'sticky'
                                }}
                            >
                                MM
                            </TableCell>
                            {flatStations.map(st => (
                                <TableCell 
                                    key={`mm_${st.id || st.OldId}`} 
                                    align="center"
                                    sx={{ 
                                        fontWeight: 600, fontSize: '0.8rem', color: '#000',
                                        bgcolor: 'background.paper',
                                        borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'rgba(0,0,0,0.1)',
                                        p: 0.5
                                    }}
                                >
                                    {getThresholdStr(st, 'mua_mua')}
                                </TableCell>
                            ))}
                        </TableRow>

                        {/* Row 6: MK (Mùa Khô) thresholds */}
                        <TableRow>
                            <TableCell 
                                align="center" 
                                sx={{ 
                                    fontWeight: 800, fontSize: '0.85rem', bgcolor: 'grey.100',
                                    borderRight: '1px solid', borderBottom: '2px solid #aaa', borderColor: 'divider',
                                    zIndex: 10, left: 0, position: 'sticky'
                                }}
                            >
                                MK
                            </TableCell>
                            {flatStations.map(st => (
                                <TableCell 
                                    key={`mk_${st.id || st.OldId}`} 
                                    align="center"
                                    sx={{ 
                                        fontWeight: 600, fontSize: '0.8rem', color: '#000',
                                        bgcolor: 'background.paper',
                                        borderRight: '1px solid', borderBottom: '2px solid #aaa', borderColor: 'rgba(0,0,0,0.1)',
                                        p: 0.5
                                    }}
                                >
                                    {getThresholdStr(st, 'mua_kho')}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={flatStations.length + 1} align="center" sx={{ py: 10 }}>
                                    <CircularProgress size={40} color="secondary" />
                                    <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>Đang tải dữ liệu...</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            daysInMonth.map((day) => (
                                <MonthlyGridRow 
                                    key={day}
                                    day={day}
                                    flatStations={flatStations}
                                    gridData={gridData}
                                    saveSingleCell={saveSingleCell}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    );
};

export default MonthlyGridTable;
