import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';

const RainCard = ({ station, onClick }) => {
    const name = station['Trạm'] || station['Tên'] || station.name || station.phuong || '';
    const thoiGian = station['Thời gian'] || '';
    const tr = station.total_rain ?? station['total_rain'];
    const luongMua = tr ? `${tr.toFixed(1)} mm` : null;

    // Check isRaining from backend boolean or fallback to TrangThai string
    const isRaining = station.is_raining ?? (typeof station['Trạng thái'] === 'string' && station['Trạng thái'].includes('Đang mưa'));
    const color = isRaining ? '#d32f2f' : '#1b5e20';
    const bgColor = isRaining ? 'rgba(211, 47, 47, 0.08)' : 'rgba(27, 94, 32, 0.08)';
    const borderColor = isRaining ? 'rgba(211, 47, 47, 0.35)' : 'rgba(27, 94, 32, 0.35)';

    return (
        <Box
            onClick={onClick}
            sx={{
                p: '12px', borderRadius: '14px',
                border: '1px solid', borderColor: borderColor,
                bgcolor: 'background.paper', minWidth: 0,
                display: 'flex', flexDirection: 'column', gap: '8px',
                cursor: onClick ? 'pointer' : 'default',
                '&:hover': onClick ? {
                    borderColor: color,
                    boxShadow: `0 6px 16px ${isRaining ? 'rgba(211,47,47,0.12)' : 'rgba(27,94,32,0.12)'}`,
                    transform: 'translateY(-2px)',
                    bgcolor: isRaining ? 'rgba(211,47,47,0.02)' : 'rgba(27,94,32,0.02)'
                } : {},
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                height: '100%'
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {/* 1. Tên bên trên */}
                <Typography sx={{
                    fontWeight: 800,
                    fontSize: '14px',
                    lineHeight: 1.3,
                    color: color,
                    wordBreak: 'break-word'
                }}>
                    {name}
                </Typography>

                {/* 2. Thời gian phía dưới */}
                {thoiGian && thoiGian !== '-' && (
                    <Typography sx={{ fontSize: '11px', color: 'text.secondary', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        🕐 {thoiGian}
                    </Typography>
                )}
            </Box>

            {luongMua && (
                <Box sx={{
                    p: '8px 10px', borderRadius: '10px',
                    bgcolor: bgColor, borderLeft: `3px solid ${color}`,
                    display: 'flex', flexDirection: 'column', gap: '4px',
                    mt: 'auto'
                }}>
                    {/* 3. Tiếp theo là thông số */}
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                        <Typography sx={{ fontSize: '20px', color: color, fontWeight: 900, lineHeight: 1.1 }}>
                            {luongMua.split(' ')[0]}
                        </Typography>
                        <Typography sx={{ fontSize: '12px', color: color, fontWeight: 700, opacity: 0.85 }}>
                            mm
                        </Typography>
                    </Box>
                </Box>
            )}
        </Box>
    );
};

const StationGroup = ({ title, data, onStationClick }) => {
    const [expanded, setExpanded] = useState(false);
    if (!data || data.length === 0) return null;

    const hasAnyRain = data.some(s => (s.total_rain ?? s['total_rain'] ?? 0) > 0);
    const topCount = hasAnyRain ? 12 : 20; // Show more if it's just a selection list
    const topStations = data.slice(0, topCount);
    const otherStations = data.slice(topCount);

    return (
        <Box sx={{ mt: 1.5, mb: 2.5 }}>
            <Typography variant="subtitle2" sx={{
                fontWeight: 900,
                mb: 1.5,
                textTransform: 'uppercase',
                fontSize: '11px',
                letterSpacing: 1,
                color: '#666',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                '&::after': { content: '""', flex: 1, height: '1px', bgcolor: 'rgba(0,0,0,0.06)' }
            }}>
                {title}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' }, gap: '8px' }}>
                    {topStations.map((station, si) => (
                        <RainCard key={si} station={station} onClick={() => onStationClick?.(station)} />
                    ))}
                </Box>

                {otherStations.length > 0 && (
                    <>
                        <Box
                            onClick={() => setExpanded(!expanded)}
                            sx={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                gap: 0.5, py: '8px', cursor: 'pointer', borderRadius: '10px',
                                bgcolor: 'rgba(0,0,0,0.02)', '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' },
                                transition: 'all 0.2s', border: '1px dashed rgba(0,0,0,0.1)'
                            }}
                        >
                            <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#888' }}>
                                {expanded ? '▲ THU GỌN' : `▼ XEM THÊM ${otherStations.length} TRẠM`}
                            </Typography>
                        </Box>
                        {expanded && (
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' }, gap: '8px' }}>
                                {otherStations.map((station, si) => (
                                    <RainCard key={`o-${si}`} station={station} onClick={() => onStationClick?.(station)} />
                                ))}
                            </Box>
                        )}
                    </>
                )}
            </Box>
        </Box>
    );
};

const RainTable = ({ title, data, handleRainChart }) => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    const onStationClick = (s) => {
        if (!handleRainChart) return;

        // Comprehensive search for station ID across all known variants
        const id = s.old_id || s.oldId || s.OldId || s.OldID;
        const name = s.name || s.phuong || s['Trạm'] || s['Tên'] || s['TenTram'] || s['tram'];
        const date = s.date || new Date().toISOString().split('T')[0];

        if (!id) {
            console.error("RainTable: Missing station ID. Object data:", s);
            // Fallback: search for any numerical value that might be an ID
            const numericalKey = Object.keys(s).find(k => k.toLowerCase().includes('id') && (typeof s[k] === 'number' || !isNaN(s[k])));
            if (numericalKey) {
                console.warn(`RainTable: Using fallback key '${numericalKey}' for ID`);
                handleRainChart(s[numericalKey], date, name);
                return;
            }
            return;
        }

        handleRainChart(id, date, name);
    };

    // Phân loại: Ưu tiên s.type, nếu không có thì dựa vào tên/phường
    const categorize = (s) => {
        if (s.type) return s.type.toLowerCase();
        const checkStr = (s.name || '' + s.phuong || '' + s.address || '').toLowerCase();
        if (checkStr.includes('xã ') || checkStr.includes('huyện ') || checkStr.includes('ngoại thành')) return 'xa';
        return 'phuong';
    };

    // Nếu tất cả trạm đều có total_rain === 0 hoặc không có total_rain, hiển thị tất cả
    const hasAnyRain = data.some(s => (s.total_rain ?? s['total_rain'] ?? 0) > 0);
    const displayStations = hasAnyRain ? data.filter(s => (s.total_rain ?? s['total_rain'] ?? 0) > 0) : data;

    // Phân loại
    const phuongStations = displayStations.filter(s => categorize(s) === 'phuong');
    const xaStations = displayStations.filter(s => categorize(s) === 'xa');
    const unknownStations = displayStations.filter(s => !categorize(s));

    // Sắp xếp
    const sortByRainOrName = (list) => [...list].sort((a, b) => {
        const ra = (b.total_rain ?? 0) - (a.total_rain ?? 0);
        if (ra !== 0) return ra;
        return (a.name || a.phuong || '').localeCompare(b.name || b.phuong || '');
    });

    return (
        <Box sx={{ my: 1, width: '100%' }}>
            {title && <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, textTransform: 'uppercase', fontSize: '13px', opacity: 0.8 }}>{title}</Typography>}
            {phuongStations.length > 0 && <StationGroup title="Khu vực Nội thành (Phường)" data={sortByRainOrName(phuongStations)} onStationClick={onStationClick} />}
            {xaStations.length > 0 && <StationGroup title="Khu vực Ngoại thành (Xã)" data={sortByRainOrName(xaStations)} onStationClick={onStationClick} />}
            {unknownStations.length > 0 && <StationGroup title="Khu vực Khác" data={sortByRainOrName(unknownStations)} onStationClick={onStationClick} />}
        </Box>
    );
};

export default RainTable;
