import React from 'react';
import { 
    Box, Typography, Stack, Grid, alpha, Paper, IconButton, Tooltip 
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconHistory, IconDeviceFloppy } from '@tabler/icons-react';

const SluiceGateSummaryCard = ({ gate, getOrgNames, onReport, onHistory, hasPermission, isCompany, user }) => {
    const theme = useTheme();
    const lastReport = gate.last_report;

    const canReport = hasPermission('sluice-gate:edit') && (isCompany || user?.org_id === gate.org_id);

    return (
        <Paper sx={{
            p: 2.2,
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            height: '100%',
            position: 'relative',
            '&:hover': {
                boxShadow: theme.shadows[4],
                borderColor: theme.palette.primary.main
            },
            transition: 'all 0.2s'
        }}>
            {/* Title / Header */}
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.dark', mb: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {gate.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                    📍 {gate.address || 'Không có địa chỉ'}
                </Typography>
            </Box>

            {/* Manager and Summary Info */}
            <Stack direction="row" spacing={2} justifyContent="space-between" sx={{ mt: 0.5 }}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.2, textTransform: 'uppercase', letterSpacing: 0.5 }}>ĐƠN VỊ QUẢN LÝ</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {getOrgNames(gate.org_id)}
                    </Typography>
                </Box>
                <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.2, textTransform: 'uppercase', letterSpacing: 0.5 }}>TỔNG SỐ CỬA</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {gate.quantity || 0}
                    </Typography>
                </Box>
            </Stack>

            {/* Visual Doors Grid */}
            {gate.quantity > 0 && (
                <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Trạng thái các cửa
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                        {Array.from({ length: gate.quantity || 0 }).map((_, idx) => {
                            const doorState = gate.doors?.[idx] || false;
                            const color = doorState ? theme.palette.error.main : theme.palette.success.main;
                            const bgColor = doorState ? alpha(theme.palette.error.main, 0.08) : alpha(theme.palette.success.main, 0.08);
                            const borderColor = doorState ? alpha(theme.palette.error.main, 0.25) : alpha(theme.palette.success.main, 0.25);

                            return (
                                <Box 
                                    key={idx}
                                    sx={{
                                        py: 0.6,
                                        px: 1,
                                        borderRadius: 2,
                                        bgcolor: bgColor,
                                        border: '1px solid',
                                        borderColor: borderColor,
                                        textAlign: 'center',
                                        minWidth: 65,
                                        flexGrow: 1
                                    }}
                                >
                                    <Typography variant="caption" sx={{ fontWeight: 800, color: color, display: 'block', fontSize: '0.65rem' }}>
                                        CỬA {idx + 1}
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 900, color: color, fontSize: '0.8rem', mt: 0.1 }}>
                                        {doorState ? 'MỞ' : 'ĐÓNG'}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Stack>
                </Box>
            )}

            {/* Last Update & Note */}
            {lastReport ? (
                <Box sx={{ mt: 'auto', pt: 1.5 }}>
                    <Box sx={{ p: 1.2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                🕐 {new Date(lastReport.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {new Date(lastReport.timestamp * 1000).toLocaleDateString()}
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                👤 {lastReport.user_name}
                            </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', fontSize: '0.75rem', color: 'text.secondary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            "{lastReport.note || 'Không có ghi chú'}"
                        </Typography>
                    </Box>
                </Box>
            ) : (
                <Typography variant="caption" color="text.disabled" sx={{ mt: 'auto', pt: 1.5, fontStyle: 'italic' }}>
                    Chưa có báo cáo vận hành
                </Typography>
            )}

            {/* Card Actions */}
            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1.5, mt: 1 }}>
                <Tooltip title="Lịch sử vận hành">
                    <IconButton color="info" size="small" onClick={() => onHistory(gate)} sx={{ borderRadius: 2 }}>
                        <IconHistory size={18} />
                    </IconButton>
                </Tooltip>
                {canReport && (
                    <Tooltip title="Báo cáo vận hành">
                        <IconButton color="secondary" size="small" onClick={() => onReport(gate)} sx={{ borderRadius: 2 }}>
                            <IconDeviceFloppy size={18} />
                        </IconButton>
                    </Tooltip>
                )}
            </Stack>
        </Paper>
    );
};

export default SluiceGateSummaryCard;
