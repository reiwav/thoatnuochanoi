import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';

const InundationCard = ({ point, onClick }) => {
    const theme = useTheme();
    const name = point['Tên điểm ngập'] || point['Vị trí ngập'] || point['street_name'] || '';
    const org = point['Đơn vị quản lý'] || point['Đơn vị trực'] || point['org_name'] || '';
    const time = point['Thời gian'] || point['Giờ bắt đầu'] || point['start_time'] || '';
    const duration = point['Tổng thời gian'] || point['Thời gian ngập'] || point['duration'] || point['Duration'] || '';
    const currentStatus = point['Trạng thái'] || point['current_status'] || point['CurrentStatus'] || '';
    
    let dimension = point['Kích thước (DxRxS)'] || point['formatted_depth'] || point['Kích thước'] || '';
    // Clean "ngập " prefix if exists
    dimension = dimension.replace(/^ngập\s+/i, '');
    
    // Only append depth if it's not already in the dimension string
    if (point['Độ sâu'] && !dimension.includes(point['Độ sâu'])) {
        dimension += (dimension ? ' x ' : '') + point['Độ sâu'];
    }

    // Extract thoiGian part (HH:mm) and optionally date part (DD/MM)
    let displayTime = '-';
    if (time) {
        const timeMatch = time.match(/\d{2}:\d{2}/);
        const dateMatch = time.match(/\d{2}\/\d{2}(?:\/\d{4})?/);
        if (timeMatch) {
            displayTime = timeMatch[0];
            if (dateMatch) {
                // Keep only DD/MM for clean space-saving visual
                const cleanDate = dateMatch[0].length > 5 ? dateMatch[0].substring(0, 5) : dateMatch[0];
                displayTime = `${timeMatch[0]} • ${cleanDate}`;
            }
        } else {
            displayTime = time;
        }
    }

    const systemColor = point['color'] || point['Color'];
    const warningColor = systemColor || theme.palette.orange?.dark || theme.palette.error.main;
    const warningBg = systemColor ? `${systemColor}15` : (theme.palette.orange?.light || theme.palette.error.light);

    const isResolved = currentStatus.toLowerCase().includes('rút') || 
                       currentStatus.toLowerCase().includes('resolved') || 
                       currentStatus.toLowerCase().includes('bình thường') || 
                       currentStatus.toLowerCase().includes('tải');

    return (
        <Box 
            onClick={onClick}
            sx={{
                p: '8px 10px', 
                borderRadius: '10px',
                border: '1px solid', 
                borderColor: systemColor ? `${systemColor}40` : warningBg,
                bgcolor: 'background.paper', 
                minWidth: 0,
                display: 'flex', 
                flexDirection: 'column', 
                gap: '4px',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: theme.shadows[3] || '0px 3px 10px rgba(0,0,0,0.08)',
                    borderColor: warningColor,
                    bgcolor: systemColor ? `${systemColor}05` : 'background.paper'
                },
                '&:active': {
                    transform: 'translateY(0)',
                }
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '13px', lineHeight: 1.3, color: warningColor, flex: 1 }}>
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
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '4px', overflow: 'hidden', flex: 1, minWidth: 0 }}>
                    {org && (
                        <>
                            <Typography sx={{ fontSize: '11px', lineHeight: 1 }}>🏢</Typography>
                            <Typography sx={{ 
                                fontSize: '11px', color: '#666', lineHeight: 1.2, 
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                            }}>
                                {org}
                            </Typography>
                        </>
                    )}
                </Box>
                
                <Box sx={{
                    px: '6px', py: '2px', borderRadius: '4px',
                    bgcolor: `${warningColor}15`, borderLeft: `2px solid ${warningColor}`,
                    flexShrink: 0
                }}>
                    <Typography sx={{ fontSize: '12px', color: warningColor, fontWeight: 800, lineHeight: 1.2 }}>
                        {dimension}
                    </Typography>
                </Box>
            </Box>

            {(currentStatus || duration) && (
                <Box sx={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    mt: '4px', pt: '4px', borderTop: '1px dashed', borderColor: 'rgba(0, 0, 0, 0.08)'
                }}>
                    {currentStatus && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Typography sx={{ fontSize: '11px', lineHeight: 1 }}>{isResolved ? '✅' : '🚨'}</Typography>
                            <Typography sx={{ fontSize: '11px', color: isResolved ? 'success.main' : warningColor, fontWeight: 700 }}>
                                {currentStatus}
                            </Typography>
                        </Box>
                    )}
                    {duration && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Typography sx={{ fontSize: '11px', lineHeight: 1 }}>{isResolved ? '⏱️' : '⏳'}</Typography>
                            <Typography sx={{ fontSize: '11px', color: 'text.secondary', fontWeight: 600 }}>
                                {duration}
                            </Typography>
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    );
};

const InundationTable = ({ title, data, handleInundationClick }) => {
    const theme = useTheme();
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    // Build rows (2 per row)
    const rows = [];
    for (let i = 0; i < data.length; i += 2) {
        rows.push(data.slice(i, i + 2));
    }

    const titleColor = theme.palette.orange?.dark || theme.palette.error.main;

    return (
        <Box sx={{ my: 1, width: '100%' }}>
            {title && (
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, textTransform: 'uppercase', fontSize: '12px', color: titleColor, opacity: 0.9 }}>
                    {title}
                </Typography>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {rows.map((group, ri) => (
                    <Box key={ri} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: '8px' }}>
                        {group.map((point, pi) => (
                            <InundationCard key={pi} point={point} onClick={() => handleInundationClick && handleInundationClick(point)} />
                        ))}
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

export default InundationTable;
