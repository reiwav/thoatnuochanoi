import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Stack, Avatar, Paper, IconButton, Collapse, Button, Tooltip, alpha, Chip, Divider, Grid
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
    IconChevronDown, IconChevronUp, IconSend, IconEngine, IconChecklist,
    IconMapPin, IconAlertTriangle, IconClock, IconDroplets, IconCloudRain, IconRipple,
    IconRuler, IconCar, IconClipboardCheck
} from '@tabler/icons-react';

import PermissionGuard from 'ui-component/PermissionGuard';
import { SurveyInfoSection, MechInfoSection, ReviewCommentSection, ReportInfoSection } from './TechnicalSections';
import { getLatestData } from 'utils/inundationUtils';
import { formatDuration } from 'utils/dataHelper';

const MetricItem = ({ icon: Icon, label, value, color }) => (
    <Box sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        p: 1,
        borderRadius: 2,
        bgcolor: alpha(color, 0.05),
        border: '1px solid',
        borderColor: alpha(color, 0.1)
    }}>
        <Stack direction="row" spacing={0.5} alignItems="center">
            <Icon size={14} color={color} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.65rem', textTransform: 'uppercase' }}>
                {label}
            </Typography>
        </Stack>
        <Typography variant="h5" sx={{ fontWeight: 900, color: color }}>
            {value || '-'}
        </Typography>
    </Box>
);

const InundationPointCard = ({ point, openTask, handleOpenViewer }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [expanded, setExpanded] = useState(false);

    const latest = useMemo(() => {
        if (!point.report_id && !point.last_report) return null;
        return getLatestData(point.active_report || point.last_report || point);
    }, [point]);

    const isHighPriority = !!point.report_id;

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2.5,
                borderRadius: 5,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid',
                borderColor: isHighPriority ? alpha(theme.palette.error.main, 0.2) : 'divider',
                boxShadow: isHighPriority
                    ? `0 10px 30px -10px ${alpha(theme.palette.error.main, 0.15)}`
                    : 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                background: isHighPriority
                    ? `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.01)} 0%, #ffffff 100%)`
                    : '#ffffff',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: isHighPriority
                        ? `0 20px 40px -12px ${alpha(theme.palette.error.main, 0.2)}`
                        : theme.shadows[8],
                    borderColor: isHighPriority ? 'error.main' : 'primary.light'
                }
            }}
        >
            {/* Status Badge - Floating Style */}
            <Box sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 1
            }}>
                {latest?.needs_correction && (
                    <Tooltip title="Nội dung báo cáo cần sửa lại">
                        <Avatar sx={{ bgcolor: 'warning.main', width: 24, height: 24, animation: 'pulse 2s infinite' }}>
                            <IconAlertTriangle size={15} color="white" />
                        </Avatar>
                    </Tooltip>
                )}
                <Chip
                    label={isHighPriority ? 'ĐANG NGẬP' : 'BÌNH THƯỜNG'}
                    size="small"
                    sx={{
                        height: 24,
                        fontSize: '0.65rem',
                        fontWeight: 900,
                        bgcolor: isHighPriority ? alpha(theme.palette.error.main, 0.1) : alpha(theme.palette.success.main, 0.1),
                        color: isHighPriority ? 'error.main' : 'success.main',
                        border: '1px solid',
                        borderColor: isHighPriority ? alpha(theme.palette.error.main, 0.2) : alpha(theme.palette.success.main, 0.2),
                        borderRadius: 1.5,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}
                />
            </Box>

            {/* Header: Avatar and Title */}
            <Tooltip title="Xem chi tiết lịch sử điểm ngập" placement="top-start">
                <Box 
                    onClick={() => navigate(`/company/station/inundation/history?id=${point.id}`)}
                    sx={{ 
                        display: 'flex', 
                        gap: 2, 
                        alignItems: 'flex-start', 
                        mb: 2.5, 
                        cursor: 'pointer',
                        p: 1,
                        ml: -1,
                        borderRadius: 2,
                        '&:hover': {
                            bgcolor: alpha(isHighPriority ? theme.palette.error.main : theme.palette.primary.main, 0.05),
                            '& h4': { color: isHighPriority ? 'error.main' : 'primary.main' }
                        },
                        transition: 'all 0.2s'
                    }}
                >
                    <Avatar sx={{
                        bgcolor: isHighPriority ? 'error.main' : 'success.main',
                        width: 48,
                        height: 48,
                        borderRadius: 3,
                        boxShadow: `0 8px 16px ${alpha(isHighPriority ? theme.palette.error.main : theme.palette.success.main, 0.25)}`
                    }}>
                        <IconMapPin size={24} color="#fff" />
                    </Avatar>
                    <Box sx={{ pr: 6 }}>
                        <Typography 
                            variant="h4" 
                            sx={{ 
                                fontWeight: 900, 
                                color: isHighPriority ? 'error.dark' : 'text.primary',
                                lineHeight: 1.2,
                                mb: 0.5,
                                fontSize: '1.1rem',
                                transition: 'color 0.2s'
                            }}
                        >
                            {point.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <IconMapPin size={12} /> {point.address || 'Hà Nội, Việt Nam'}
                        </Typography>
                    </Box>
                </Box>
            </Tooltip>

            {/* Sub-Header: Start Time for Active Reports */}
            {isHighPriority && point.active_report?.start_time && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, px: 1, py: 0.5, bgcolor: alpha(theme.palette.error.main, 0.05), borderRadius: 1.5 }}>
                    <IconClock size={14} color={theme.palette.error.main} />
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'error.main' }}>
                        Bắt đầu từ: {new Date(point.active_report.start_time).toLocaleTimeString()} ({formatDuration(point.active_report.start_time)})
                    </Typography>
                </Stack>
            )}

            {/* Role-based Metrics Section */}
            {isHighPriority && latest && (
                <Stack spacing={1.5} sx={{ mb: 2.5 }}>
                    {/* 1. Báo cáo Tình hình (Report) */}
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.03), p: 1, borderRadius: 2, border: '1px solid', borderColor: alpha(theme.palette.secondary.main, 0.1) }}>
                        <Box sx={{ bgcolor: 'secondary.main', p: 0.5, borderRadius: 1, display: 'flex' }}>
                            <IconMapPin size={14} color="#fff" />
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 800, flex: 1 }}>
                            {(latest.depth != null || latest.length != null || latest.width != null)
                                ? `${latest.length || '?'} x ${latest.width || '?'} x ${latest.depth || 0}`
                                : 'Chưa có thông số kích thước'}
                        </Typography>
                        <Chip
                            label={latest.traffic_status || 'Bình thường'}
                            size="small"
                            variant="outlined"
                            color={latest.traffic_status === 'Không đi lại được' ? 'error' : (latest.traffic_status === 'Đi lại khó khăn' ? 'warning' : 'success')}
                            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }}
                        />
                    </Stack>

                    {/* 2. Trạng thái TK Giám sát (Survey) */}
                    {latest.survey_checked && (
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1 }}>
                            <IconClipboardCheck size={14} color={theme.palette.primary.main} />
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.dark' }}>
                                TK Giám sát: Đã nhận xét
                            </Typography>
                        </Stack>
                    )}

                    {/* 3. Trạng thái CG xử lý (Mechanic) */}
                    {latest.mech_checked && (
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1 }}>
                            <IconEngine size={14} color={theme.palette.secondary.main} />
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'secondary.dark' }}>
                                CG xử lý: Đã xử lý
                            </Typography>
                        </Stack>
                    )}
                </Stack>
            )}

            {/* Secondary Data Preview */}
            {!isHighPriority && latest?.updated_at && (
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2, fontStyle: 'italic', opacity: 0.7 }}>
                    Cập nhật lần cuối: {new Date(latest.updated_at).toLocaleString()}
                </Typography>
            )}

            {/* Actions Bar */}
            <Divider sx={{ mt: 'auto', mb: 2, borderStyle: 'dashed' }} />
            <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                <Button
                    size="small"
                    color="inherit"
                    startIcon={expanded ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
                    onClick={() => setExpanded(!expanded)}
                    sx={{
                        fontWeight: 800,
                        borderRadius: 2.5,
                        textTransform: 'none',
                        color: 'text.secondary',
                        px: 1.5,
                        '&:hover': { bgcolor: 'grey.100' }
                    }}
                >
                    {expanded ? 'Thu gọn' : 'Chi tiết'}
                </Button>

                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                    <PermissionGuard permission="inundation:report">
                        <Button
                            variant="contained"
                            size="small"
                            color="secondary"
                            startIcon={<IconSend size={16} />}
                            onClick={() => openTask('REPORT', point)}
                            sx={{ borderRadius: 2.5, fontWeight: 800, px: 1.5 }}
                        >
                            Báo cáo
                        </Button>
                    </PermissionGuard>

                    {isHighPriority && (
                        <>
                            <PermissionGuard permission="inundation:survey">
                                <Button
                                    variant="contained"
                                    size="small"
                                    color="primary"
                                    startIcon={<IconClipboardCheck size={16} />}
                                    onClick={() => openTask('SURVEY', point)}
                                    sx={{ borderRadius: 2.5, fontWeight: 800, px: 1.5 }}
                                >
                                    TK Giám sát
                                </Button>
                            </PermissionGuard>

                            <PermissionGuard permission="inundation:mechanic">
                                <Button
                                    variant="contained"
                                    size="small"
                                    color="info"
                                    startIcon={<IconEngine size={16} />}
                                    onClick={() => openTask('MECH', point)}
                                    sx={{ borderRadius: 2.5, fontWeight: 800, px: 1.5 }}
                                >
                                    CG xử lý
                                </Button>
                            </PermissionGuard>

                            <PermissionGuard permission="inundation:review">
                                <Button
                                    variant="contained"
                                    size="small"
                                    color="error"
                                    startIcon={<IconChecklist size={16} />}
                                    onClick={() => openTask('REVIEW', point)}
                                    sx={{ borderRadius: 2.5, fontWeight: 800, px: 1.5 }}
                                >
                                    Nhận xét
                                </Button>
                            </PermissionGuard>
                        </>
                    )}
                </Stack>
            </Stack>

            {/* Detail Content */}
            <Collapse in={expanded} timeout="auto" unmountOnExit>
                <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    {latest ? (
                        <Stack spacing={2}>
                            {/* Detailed Info Sections */}
                            {isHighPriority && <ReportInfoSection latest={latest} handleOpenViewer={handleOpenViewer} />}
                            <SurveyInfoSection latest={latest} handleOpenViewer={handleOpenViewer} />
                            <MechInfoSection latest={latest} handleOpenViewer={handleOpenViewer} />
                            <ReviewCommentSection latest={latest} />
                        </Stack>
                    ) : (
                        <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 3, fontStyle: 'italic' }}>
                            Chưa có dữ liệu vận hành gần nhất
                        </Typography>
                    )}
                </Box>
            </Collapse>
            <style>{`
                @keyframes pulse { 
                    0% { transform: scale(1); opacity: 1; } 
                    50% { transform: scale(1.1); opacity: 0.8; } 
                    100% { transform: scale(1); opacity: 1; } 
                }
            `}</style>
        </Paper>
    );
};

export default InundationPointCard;
