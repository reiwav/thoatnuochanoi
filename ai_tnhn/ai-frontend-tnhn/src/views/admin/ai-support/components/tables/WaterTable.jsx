import React, { useState } from 'react';
import { Box, Typography, useTheme } from '@mui/material';

const WaterCard = ({ station }) => {
    const theme = useTheme();
    const name = station['Tên'] || station['name'] || '';
    const diaChi = station['Địa chỉ'] || station['address'] || '';
    const rawGiaTri = station['Giá trị'] || (station.level !== undefined ? (station.level > 0 ? station.level.toFixed(2) : '...') : '...');
    const trangThai = station['Trạng thái'] || station['status_text'] || '';
    const colorStatus = station['Color'] || station['color'] || station['threshold_status'] || '';

    const isHigh = colorStatus === 'high' || trangThai.includes('cao') || trangThai.includes('Vượt');
    const isLow = colorStatus === 'low' || trangThai.includes('thấp');
    const isNoData = colorStatus === 'no_data' || trangThai.includes('Chưa có') || rawGiaTri === '...' || rawGiaTri === '0.00' || rawGiaTri === '0' || !rawGiaTri;

    let giaTri = rawGiaTri;
    if (isNoData) {
        giaTri = '...';
    }

    let primaryColor = theme.palette.primary.main;
    let primaryBg = theme.palette.primary.light + '20';
    let cardBorderColor = 'divider';

    if (isNoData) {
        primaryColor = '#90a4ae';
        primaryBg = 'rgba(144, 164, 174, 0.12)';
    } else if (isHigh) {
        primaryColor = '#d32f2f';
        primaryBg = 'rgba(211, 47, 47, 0.14)';
        cardBorderColor = 'rgba(211, 47, 47, 0.4)';
    } else if (isLow) {
        primaryColor = '#ed6c02';
        primaryBg = 'rgba(237, 108, 2, 0.14)';
        cardBorderColor = 'rgba(237, 108, 2, 0.4)';
    } else {
        primaryColor = '#2e7d32';
        primaryBg = 'rgba(46, 125, 50, 0.14)';
    }

    // Extract thoiGian and format it to show ONLY hours/minutes
    let rawThoiGian = station['Cập nhật'] || station['thoi_gian'] || '';
    let displayTime = '-';
    if (!isNoData && rawThoiGian && rawThoiGian !== '...') {
        const match = rawThoiGian.match(/\d{2}:\d{2}/);
        if (match) {
            displayTime = match[0];
        } else {
            try {
                const d = new Date(rawThoiGian);
                if (!isNaN(d)) {
                    displayTime = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                }
            } catch (e) {
                displayTime = rawThoiGian;
            }
        }
    }

    return (
        <Box sx={{
            p: '8px 10px', borderRadius: '10px',
            border: '1px solid', borderColor: cardBorderColor,
            bgcolor: isHigh ? '#fff5f5' : (isLow ? '#fffdf5' : 'background.paper'),
            minWidth: 0,
            display: 'flex', flexDirection: 'column', gap: '4px'
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '13px', lineHeight: 1.3, color: isHigh ? '#c62828' : '#1a1a1a', flex: 1 }}>
                    {name}
                </Typography>
                {displayTime !== '-' && (
                    <Typography sx={{ fontSize: '11px', color: 'text.secondary', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, mt: '2px' }}>
                        🕐 {displayTime}
                    </Typography>
                )}
            </Box>

            <Box sx={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1
            }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '4px', overflow: 'hidden', flex: 1 }}>
                    {diaChi && (
                        <>
                            <Typography sx={{ fontSize: '11px', lineHeight: 1 }}>📍</Typography>
                            <Typography sx={{ 
                                fontSize: '11px', color: '#666', lineHeight: 1.2, 
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                            }}>
                                {diaChi}
                            </Typography>
                        </>
                    )}
                </Box>
                
                <Box sx={{
                    px: '6px', py: '2px', borderRadius: '4px',
                    bgcolor: primaryBg, borderLeft: `2px solid ${primaryColor}`,
                    flexShrink: 0
                }}>
                    <Typography sx={{ fontSize: '13px', color: primaryColor, fontWeight: 800, lineHeight: 1.2 }}>
                        {giaTri}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

const WaterTable = ({ title, data }) => {
    const [expanded, setExpanded] = useState(false);
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    // Sort by priority desc
    const sorted = [...data].sort((a, b) => {
        const pa = a.priority ?? a['priority'] ?? 0;
        const pb = b.priority ?? b['priority'] ?? 0;
        return pb - pa;
    });

    const priorityStations = sorted.filter(s => (s.priority ?? s['priority'] ?? 0) > 0);
    const otherStations = sorted.filter(s => (s.priority ?? s['priority'] ?? 0) <= 0);

    const buildRows = (list) => {
        const rows = [];
        for (let i = 0; i < list.length; i += 3) {
            rows.push(list.slice(i, i + 3));
        }
        return rows;
    };

    const priorityRows = buildRows(priorityStations);
    const otherRows = buildRows(otherStations);

    return (
        <Box sx={{ my: 1, width: '100%' }}>
            {title && <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, textTransform: 'uppercase', fontSize: '12px', opacity: 0.8 }}>{title}</Typography>}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {priorityRows.map((group, ri) => (
                    <Box key={ri} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: '6px' }}>
                        {group.map((station, si) => (
                            <WaterCard key={si} station={station} />
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
                                    <WaterCard key={si} station={station} />
                                ))}
                            </Box>
                        ))}
                    </>
                )}
            </Box>
        </Box>
    );
};

export default WaterTable;
