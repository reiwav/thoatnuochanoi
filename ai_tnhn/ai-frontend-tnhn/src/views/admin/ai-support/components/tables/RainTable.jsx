import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';

const RainCard = ({ station }) => {
    const name = station['Trạm'] || station['Tên'] || station.name || '';
    const thoiGian = station['Thời gian'] || '';
    const luongMua = station['Lượng mưa'] || (station.total_rain ? `${station.total_rain.toFixed(1)}mm` : '0mm');
    const trangThai = station['Trạng thái'] || '';

    // Extract numerical value for coloring
    let isRaining = trangThai.includes('Đang mưa');
    let color = isRaining ? '#0084FF' : '#9e9e9e';
    let bgColor = isRaining ? 'rgba(0,132,255,0.08)' : 'rgba(158,158,158,0.1)';

    return (
        <Box sx={{
            p: '8px 10px', borderRadius: '10px',
            border: '1px solid', borderColor: 'divider',
            bgcolor: 'background.paper', minWidth: 0,
            display: 'flex', flexDirection: 'column', gap: '4px'
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '13px', lineHeight: 1.3, color: '#1a1a1a', flex: 1 }}>
                    {name}
                </Typography>
                {thoiGian && thoiGian !== '-' && (
                    <Typography sx={{ fontSize: '11px', color: 'text.secondary', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, mt: '2px' }}>
                        🕐 {thoiGian}
                    </Typography>
                )}
            </Box>
            
            <Box sx={{ 
                p: '4px 8px', borderRadius: '6px', 
                bgcolor: bgColor, borderLeft: `3px solid ${color}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <Typography sx={{ fontSize: '14px', color: color, fontWeight: 800, lineHeight: 1.2 }}>
                    {luongMua}
                </Typography>
                <Typography sx={{ fontSize: '10px', color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                    {trangThai}
                </Typography>
            </Box>
        </Box>
    );
};

const StationGroup = ({ title, data }) => {
    const [expanded, setExpanded] = useState(false);
    if (!data || data.length === 0) return null;

    const topStations = data.slice(0, 9);
    const otherStations = data.slice(9);

    const buildRows = (list) => {
        const rows = [];
        for (let i = 0; i < list.length; i += 3) {
            rows.push(list.slice(i, i + 3));
        }
        return rows;
    };

    const topRows = buildRows(topStations);
    const otherRows = buildRows(otherStations);

    return (
        <Box sx={{ mt: 1, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, textTransform: 'uppercase', fontSize: '12px', opacity: 0.8, color: '#555' }}>
                {title}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {topRows.map((group, ri) => (
                    <Box key={ri} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: '6px' }}>
                        {group.map((station, si) => (
                            <RainCard key={si} station={station} />
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
                        {expanded && otherRows.map((group, ri) => (
                            <Box key={`o-${ri}`} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: '6px' }}>
                                {group.map((station, si) => (
                                    <RainCard key={si} station={station} />
                                ))}
                            </Box>
                        ))}
                    </>
                )}
            </Box>
        </Box>
    );
};

const RainTable = ({ title, data }) => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    // Lọc ra các trạm có lượng mưa > 0
    const rainingStations = data.filter(s => {
        const tr = s.total_rain ?? s['total_rain'] ?? 0;
        return tr > 0;
    });

    // Phân loại
    const phuongStations = rainingStations.filter(s => (s.type ?? s['type']) === 'phuong');
    const xaStations = rainingStations.filter(s => (s.type ?? s['type']) === 'xa');
    
    // Nếu không có thông tin type, đưa vào danh sách chung
    const unknownStations = rainingStations.filter(s => !(s.type ?? s['type']));

    // Sắp xếp Phường: Lượng mưa desc
    phuongStations.sort((a, b) => {
        const ra = a.total_rain ?? a['total_rain'] ?? 0;
        const rb = b.total_rain ?? b['total_rain'] ?? 0;
        return rb - ra;
    });

    // Sắp xếp Xã: Trọng số desc, Lượng mưa desc
    xaStations.sort((a, b) => {
        const pa = a.priority ?? a['priority'] ?? 0;
        const pb = b.priority ?? b['priority'] ?? 0;
        if (pb !== pa) return pb - pa;
        const ra = a.total_rain ?? a['total_rain'] ?? 0;
        const rb = b.total_rain ?? b['total_rain'] ?? 0;
        return rb - ra;
    });

    // Sắp xếp Unknown: Lượng mưa desc
    unknownStations.sort((a, b) => {
        const ra = a.total_rain ?? a['total_rain'] ?? 0;
        const rb = b.total_rain ?? b['total_rain'] ?? 0;
        return rb - ra;
    });

    return (
        <Box sx={{ my: 1, width: '100%' }}>
            {title && <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, textTransform: 'uppercase', fontSize: '13px', opacity: 0.8 }}>{title}</Typography>}
            {phuongStations.length > 0 && <StationGroup title="Khu vực Nội thành (Phường)" data={phuongStations} />}
            {xaStations.length > 0 && <StationGroup title="Khu vực Ngoại thành (Xã)" data={xaStations} />}
            {unknownStations.length > 0 && <StationGroup title="Khu vực Khác" data={unknownStations} />}
        </Box>
    );
};

export default RainTable;
