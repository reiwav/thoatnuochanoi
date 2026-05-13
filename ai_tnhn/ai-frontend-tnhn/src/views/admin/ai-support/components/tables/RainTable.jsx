import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';

const RainCard = ({ station, onClick }) => {
    const name = station['Trạm'] || station['Tên'] || station.name || station.phuong || '';
    const thoiGian = station['Thời gian'] || '';
    const tr = station.total_rain ?? station['total_rain'];
    const luongMua = tr ? `${tr.toFixed(1)}mm` : null;
    const trangThai = station['Trạng thái'] || '';

    // Extract numerical value for coloring
    let isRaining = trangThai.includes('Đang mưa') || (tr > 0);
    let color = isRaining ? '#0084FF' : '#555';
    let bgColor = isRaining ? 'rgba(0,132,255,0.08)' : 'rgba(0,0,0,0.04)';

    return (
        <Box 
            onClick={onClick}
            sx={{
                p: '10px 12px', borderRadius: '12px',
                border: '1px solid', borderColor: isRaining ? 'rgba(0,132,255,0.3)' : 'divider',
                bgcolor: 'background.paper', minWidth: 0,
                display: 'flex', flexDirection: 'column', gap: '4px',
                cursor: onClick ? 'pointer' : 'default',
                '&:hover': onClick ? {
                    borderColor: '#0084FF',
                    boxShadow: '0 4px 12px rgba(0,132,255,0.15)',
                    transform: 'translateY(-2px)',
                    bgcolor: 'rgba(0,132,255,0.02)'
                } : {},
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                height: '100%',
                justifyContent: luongMua ? 'flex-start' : 'center'
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ 
                    fontWeight: 700, 
                    fontSize: '13px', 
                    lineHeight: 1.3, 
                    color: isRaining ? '#0084FF' : '#1a1a1a', 
                    flex: 1,
                    textAlign: luongMua ? 'left' : 'center'
                }}>
                    {name}
                </Typography>
                {thoiGian && thoiGian !== '-' && (
                    <Typography sx={{ fontSize: '10px', color: 'text.secondary', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        🕐 {thoiGian}
                    </Typography>
                )}
            </Box>
            
            {luongMua && (
                <Box sx={{ 
                    p: '4px 8px', borderRadius: '6px', 
                    bgcolor: bgColor, borderLeft: `3px solid ${color}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    mt: 0.5
                }}>
                    <Typography sx={{ fontSize: '13px', color: color, fontWeight: 800, lineHeight: 1.2 }}>
                        {luongMua}
                    </Typography>
                    <Typography sx={{ fontSize: '9px', color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                        {trangThai || (isRaining ? 'Có mưa' : 'Không mưa')}
                    </Typography>
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

    const buildRows = (list) => {
        const rows = [];
        for (let i = 0; i < list.length; i += 4) {
            rows.push(list.slice(i, i + 4));
        }
        return rows;
    };

    const topRows = buildRows(topStations);
    const otherRows = buildRows(otherStations);

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
                {topRows.map((group, ri) => (
                    <Box key={ri} sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                        {group.map((station, si) => (
                            <RainCard key={si} station={station} onClick={() => onStationClick?.(station)} />
                        ))}
                    </Box>
                ))}
                
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
                        {expanded && otherRows.map((group, ri) => (
                            <Box key={`o-${ri}`} sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                {group.map((station, si) => (
                                    <RainCard key={si} station={station} onClick={() => onStationClick?.(station)} />
                                ))}
                            </Box>
                        ))}
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
        const id = s.old_id || s.oldId || s.OldId || s.OldID || s.id || s['ID'];
        const name = s.name || s.phuong || s['Trạm'] || s['Tên'];
        const date = s.date || new Date().toISOString().split('T')[0];
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
