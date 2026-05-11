import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';

const PUMP_COLORS = {
    vanHanh: { color: '#d32f2f', bg: 'rgba(211,47,47,0.1)', label: 'VẬN HÀNH' },
    khongVH: { color: '#2e7d32', bg: 'rgba(46,125,50,0.1)', label: 'KHÔNG VH' },
    baoDuong: { color: '#f9a825', bg: 'rgba(249,168,37,0.12)', label: 'BẢO DƯỠNG' },
    matTinHieu: { color: '#9e9e9e', bg: 'rgba(158,158,158,0.1)', label: 'MẤT TÍN HIỆU' },
};

const PumpCountBadge = ({ value, config }) => (
    <Box sx={{ textAlign: 'center', flex: 1, p: '2px', borderRadius: '6px', bgcolor: config.bg, minWidth: 0 }}>
        <Typography sx={{ fontSize: '16px', fontWeight: 800, color: config.color, lineHeight: 1.2 }}>{value}</Typography>
        <Typography sx={{ fontSize: '8px', fontWeight: 700, color: config.color, opacity: 0.85, lineHeight: 1.2, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{config.label}</Typography>
    </Box>
);

const PumpStationCard = ({ station, getCounts }) => {
    const name = station['Tên trạm bơm'] || station['Tên'] || station.name || '';
    const capNhat = station['Cập nhật'] || station.last_update || '';
    const counts = getCounts(station);
    return (
        <Box sx={{
            p: '8px 10px', borderRadius: '10px',
            border: '1px solid', borderColor: 'divider',
            bgcolor: 'background.paper', minWidth: 0
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: '6px' }}>
                <Typography sx={{ fontWeight: 700, fontSize: '12px', lineHeight: 1.3, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
                    {name}
                </Typography>
                {capNhat && capNhat !== '-' && (
                    <Typography sx={{ fontSize: '11px', color: 'text.secondary', fontWeight: 600, ml: 1, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        🕐 {capNhat}
                    </Typography>
                )}
            </Box>
            <Box sx={{ display: 'flex', gap: '4px' }}>
                <PumpCountBadge value={counts.vh} config={PUMP_COLORS.vanHanh} />
                <PumpCountBadge value={counts.kvh} config={PUMP_COLORS.khongVH} />
                <PumpCountBadge value={counts.bd} config={PUMP_COLORS.baoDuong} />
                <PumpCountBadge value={counts.mth} config={PUMP_COLORS.matTinHieu} />
            </Box>
            <Typography sx={{ fontSize: '11px', color: 'text.secondary', mt: '4px', fontWeight: 600 }}>
                TỔNG SỐ BƠM: {counts.total} máy
            </Typography>
        </Box>
    );
};

const PumpingStationTable = ({ title, data }) => {
    const [expanded, setExpanded] = useState(false);
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    const getCounts = (station) => {
        let vh = station['Vận hành'];
        let kvh = station['Không VH'];
        let bd = station['Bảo dưỡng'];
        let mth = station['Mất tín hiệu'];
        let total = station['Tổng số bơm'];
        if (vh === undefined && station.operating_count !== undefined) {
            vh = station.operating_count;
            kvh = station.closed_count;
            bd = station.maintenance_count;
            total = station.pump_count;
            mth = (total > 0 && vh === 0 && kvh === 0 && bd === 0) ? total : 0;
        }
        return { vh: vh ?? 0, kvh: kvh ?? 0, bd: bd ?? 0, mth: mth ?? 0, total: total ?? 0 };
    };

    // Sort by priority desc
    const sorted = [...data].sort((a, b) => {
        const pa = a.priority ?? a['priority'] ?? 0;
        const pb = b.priority ?? b['priority'] ?? 0;
        return pb - pa;
    });

    const priorityStations = sorted.filter(s => (s.priority ?? s['priority'] ?? 0) > 0);
    const otherStations = sorted.filter(s => (s.priority ?? s['priority'] ?? 0) <= 0);

    // Build rows (2 per row)
    const buildRows = (list) => {
        const rows = [];
        for (let i = 0; i < list.length; i += 2) {
            rows.push(list.slice(i, i + 2));
        }
        return rows;
    };

    const priorityRows = buildRows(priorityStations);
    const otherRows = buildRows(otherStations);

    return (
        <Box sx={{ my: 1, width: '100%' }}>
            {title && <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, textTransform: 'uppercase', fontSize: '12px', opacity: 0.8 }}>{title}</Typography>}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {priorityRows.map((pair, ri) => (
                    <Box key={ri} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: '6px' }}>
                        {pair.map((station, si) => (
                            <PumpStationCard key={si} station={station} getCounts={getCounts} />
                        ))}
                    </Box>
                ))}
                {otherStations.length > 0 && (
                    <>
                        <Box
                            onClick={() => setExpanded(!expanded)}
                            sx={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                gap: 0.5, py: '6px', cursor: 'pointer', borderRadius: '8px',
                                bgcolor: 'rgba(0,0,0,0.03)', '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
                                transition: 'background-color 0.2s'
                            }}
                        >
                            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#666' }}>
                                {expanded ? '▲ Thu gọn' : `▼ Chi tiết (${otherStations.length} trạm khác)`}
                            </Typography>
                        </Box>
                        {expanded && otherRows.map((pair, ri) => (
                            <Box key={`o-${ri}`} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: '6px' }}>
                                {pair.map((station, si) => (
                                    <PumpStationCard key={si} station={station} getCounts={getCounts} />
                                ))}
                            </Box>
                        ))}
                    </>
                )}
            </Box>
        </Box>
    );
};

export default PumpingStationTable;
