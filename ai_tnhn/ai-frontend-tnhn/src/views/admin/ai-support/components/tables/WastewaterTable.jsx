import React from 'react';
import { Box, Typography } from '@mui/material';
import dayjs from 'dayjs';

const WastewaterCard = ({ station }) => {
    const name = station['Tên'] || station['name'] || station['Tên trạm'] || '';

    // Extract note/báo cáo
    let note = station['Báo cáo'];
    if (note === undefined) {
        note = (station.last_report && station.last_report.note) ? station.last_report.note : 'Bình thường';
    }

    // Extract time
    let thoiGian = station['Thời gian'];
    if (!thoiGian) {
        if (station.last_report && station.last_report.timestamp) {
            thoiGian = dayjs.unix(station.last_report.timestamp).format('HH:mm DD/MM/YYYY');
        } else if (station.updated_at) {
            // handle the unix timestamp or ISO string in updated_at
            thoiGian = typeof station.updated_at === 'number'
                ? dayjs.unix(station.updated_at).format('HH:mm DD/MM/YYYY')
                : dayjs(station.updated_at).format('HH:mm DD/MM/YYYY');
        } else {
            thoiGian = '-';
        }
    }

    // Xác định màu sắc dựa trên nội dung báo cáo (có thể tuỳ chỉnh theo logic thực tế)
    const isNormal = note.toLowerCase().includes('bình thường');
    const color = isNormal ? '#2e7d32' : '#f9a825';
    const bgColor = isNormal ? 'rgba(46,125,50,0.08)' : 'rgba(249,168,37,0.08)';

    return (
        <Box sx={{
            p: '8px 10px', borderRadius: '10px',
            border: '1px solid', borderColor: 'divider',
            bgcolor: 'background.paper', minWidth: 0,
            display: 'flex', flexDirection: 'column', gap: '6px'
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '13px', lineHeight: 1.3, color: '#1a1a1a', flex: 1 }}>
                    {name}
                </Typography>
                {thoiGian && thoiGian !== '-' && (
                    <Typography sx={{ fontSize: '12px', color: 'text.secondary', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, mt: '2px' }}>
                        🕐 {thoiGian}
                    </Typography>
                )}
            </Box>

            <Box sx={{
                p: '6px 8px', borderRadius: '6px',
                bgcolor: bgColor, borderLeft: `3px solid ${color}`
            }}>
                <Typography sx={{ fontSize: '12px', color: '#333', fontWeight: 500, lineHeight: 1.4 }}>
                    {note}
                </Typography>
            </Box>
        </Box>
    );
};

const WastewaterTable = ({ title, data }) => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    // Build rows (2 per row)
    const rows = [];
    for (let i = 0; i < data.length; i += 2) {
        rows.push(data.slice(i, i + 2));
    }

    return (
        <Box sx={{ my: 1, width: '100%' }}>
            {title && <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, textTransform: 'uppercase', fontSize: '12px', opacity: 0.8 }}>{title}</Typography>}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {rows.map((pair, ri) => (
                    <Box key={ri} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: '6px' }}>
                        {pair.map((station, si) => (
                            <WastewaterCard key={si} station={station} />
                        ))}
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

export default WastewaterTable;
