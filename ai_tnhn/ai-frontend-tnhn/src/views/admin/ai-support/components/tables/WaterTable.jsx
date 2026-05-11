import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';

const WaterCard = ({ station }) => {
    const name = station['Tên'] || station['name'] || '';
    const giaTri = station['Giá trị'] || (station.level !== undefined ? `${station.level.toFixed(2)}m` : '-');
    
    // Extract thoiGian and format it to show ONLY hours/minutes
    let rawThoiGian = station['Cập nhật'] || station['thoi_gian'] || '';
    let displayTime = '-';
    if (rawThoiGian) {
        // rawThoiGian might be "15:04 05/05/2026" or "15:04" or ISO string
        // We just take the HH:mm part
        const match = rawThoiGian.match(/\d{2}:\d{2}/);
        if (match) {
            displayTime = match[0];
        } else {
            // fallback if it's standard ISO string
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
            border: '1px solid', borderColor: 'divider',
            bgcolor: 'background.paper', minWidth: 0,
            display: 'flex', flexDirection: 'column', gap: '4px'
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '13px', lineHeight: 1.3, color: '#1a1a1a', flex: 1 }}>
                    {name}
                </Typography>
                {displayTime !== '-' && (
                    <Typography sx={{ fontSize: '11px', color: 'text.secondary', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, mt: '2px' }}>
                        🕐 {displayTime}
                    </Typography>
                )}
            </Box>
            
            <Box sx={{ 
                p: '4px 8px', borderRadius: '6px', 
                bgcolor: 'rgba(0,132,255,0.08)', borderLeft: `3px solid #0084FF` 
            }}>
                <Typography sx={{ fontSize: '14px', color: '#0084FF', fontWeight: 800, lineHeight: 1.2 }}>
                    Mực nước: {giaTri}
                </Typography>
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

    // Build rows (3 per row)
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
