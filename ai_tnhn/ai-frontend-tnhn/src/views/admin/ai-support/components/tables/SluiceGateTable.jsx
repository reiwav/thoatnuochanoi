import React, { useState } from 'react';
import { Box, Typography, Chip } from '@mui/material';

const SluiceGateCard = ({ gate }) => {
    const name = gate['Tên cửa phai'] || gate['Tên'] || gate.name || '';
    const capNhat = gate['Cập nhật'] || gate.last_update || '';
    const mo = gate['Mở'] ?? gate.open_count ?? 0;
    const dong = gate['Đóng'] ?? gate.closed_count ?? 0;
    const tong = gate['Tổng số cửa'] ?? gate.quantity ?? 0;
    const note = gate['Ghi chú'] || gate.note || '';

    return (
        <Box sx={{
            p: '8px 10px', borderRadius: '10px',
            border: '1px solid', borderColor: 'divider',
            bgcolor: 'background.paper', minWidth: 0,
            display: 'flex', flexDirection: 'column', gap: '6px'
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: '4px' }}>
                <Typography sx={{ fontWeight: 700, fontSize: '12px', lineHeight: 1.3, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
                    {name}
                </Typography>
                {capNhat && capNhat !== '-' && (
                    <Typography sx={{ fontSize: '11px', color: 'text.secondary', fontWeight: 600, ml: 1, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        🕐 {capNhat}
                    </Typography>
                )}
            </Box>

            <Box sx={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <Chip 
                    label={`Mở: ${mo}`} 
                    size="small" 
                    sx={{ 
                        height: '20px', 
                        fontSize: '10px', 
                        fontWeight: 700, 
                        bgcolor: 'rgba(211,47,47,0.1)', 
                        color: '#d32f2f',
                        borderRadius: '4px'
                    }} 
                />
                <Chip 
                    label={`Đóng: ${dong}`} 
                    size="small" 
                    sx={{ 
                        height: '20px', 
                        fontSize: '10px', 
                        fontWeight: 700, 
                        bgcolor: 'rgba(46,125,50,0.1)', 
                        color: '#2e7d32',
                        borderRadius: '4px'
                    }} 
                />
                <Typography sx={{ fontSize: '11px', color: 'text.secondary', fontWeight: 600, ml: 'auto' }}>
                    TỔNG: {tong} cửa
                </Typography>
            </Box>

            {note && note !== '-' && (
                <Box sx={{ 
                    p: '4px 8px', 
                    borderRadius: '6px', 
                    bgcolor: 'rgba(0,0,0,0.02)', 
                    borderLeft: '2px solid rgba(0,0,0,0.1)',
                    mt: '2px'
                }}>
                    <Typography sx={{ fontSize: '11px', color: 'text.secondary', fontStyle: 'italic', lineHeight: 1.3 }}>
                        {note}
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

const SluiceGateTable = ({ title, data }) => {
    const [expanded, setExpanded] = useState(false);
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    // Sort by priority desc
    const sorted = [...data].sort((a, b) => {
        const pa = a.priority ?? 0;
        const pb = b.priority ?? 0;
        return pb - pa;
    });

    const priorityGates = sorted.filter(s => (s.priority ?? 0) > 0);
    const otherGates = sorted.filter(s => (s.priority ?? 0) <= 0);

    const buildRows = (list) => {
        const rows = [];
        for (let i = 0; i < list.length; i += 2) {
            rows.push(list.slice(i, i + 2));
        }
        return rows;
    };

    const priorityRows = buildRows(priorityGates);
    const otherRows = buildRows(otherGates);

    return (
        <Box sx={{ my: 1, width: '100%' }}>
            {title && <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, textTransform: 'uppercase', fontSize: '12px', opacity: 0.8 }}>{title}</Typography>}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {priorityRows.map((pair, ri) => (
                    <Box key={ri} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: '6px' }}>
                        {pair.map((gate, si) => (
                            <SluiceGateCard key={si} gate={gate} />
                        ))}
                    </Box>
                ))}
                {otherGates.length > 0 && (
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
                                {expanded ? '▲ Thu gọn' : `▼ Chi tiết (${otherGates.length} cửa phai khác)`}
                            </Typography>
                        </Box>
                        {expanded && otherRows.map((pair, ri) => (
                            <Box key={`o-${ri}`} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: '6px' }}>
                                {pair.map((gate, si) => (
                                    <SluiceGateCard key={si} gate={gate} />
                                ))}
                            </Box>
                        ))}
                    </>
                )}
            </Box>
        </Box>
    );
};

export default SluiceGateTable;
