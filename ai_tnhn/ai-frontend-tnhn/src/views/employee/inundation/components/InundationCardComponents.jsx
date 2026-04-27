import React from 'react';
import {
    Box, Typography, Stack, Avatar, Button, Tooltip, alpha, Chip, Divider, Collapse, CircularProgress
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    IconChevronDown, IconChevronUp, IconSend, IconEngine, IconChecklist,
    IconMapPin, IconAlertTriangle, IconClock, IconClipboardCheck
} from '@tabler/icons-react';
import PermissionGuard from 'ui-component/PermissionGuard';
import { SurveyInfoSection, MechInfoSection, ReviewCommentSection, ReportInfoSection } from './TechnicalSections';
import { formatDuration } from 'utils/dataHelper';

export const MetricItem = ({ icon: Icon, label, value, color }) => (
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

export const CardHeader = ({ point, latest, isHighPriority, navigate, openTask, onQuickFinish, onOpenDetail, finishing, theme }) => (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 2.5, position: 'relative' }}>
        <Tooltip title="Xem chi tiết lịch sử điểm ngập" placement="top-start">
            <span>
                <Avatar
                    onClick={() => onOpenDetail(point)}
                    sx={{
                        bgcolor: isHighPriority ? (latest?.flood_level_color || theme.palette.error.main) : theme.palette.success.main,
                        width: 48,
                        height: 48,
                        borderRadius: 3,
                        cursor: 'pointer',
                        boxShadow: `0 8px 16px ${alpha(isHighPriority ? (latest?.flood_level_color || theme.palette.error.main) : theme.palette.success.main, 0.25)}`,
                        transition: 'transform 0.2s',
                        '&:hover': { transform: 'scale(1.05)' }
                    }}
                >
                    <IconMapPin size={24} color="#fff" />
                </Avatar>
            </span>
        </Tooltip>

        <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Box
                    onClick={() => onOpenDetail(point)}
                    sx={{ cursor: 'pointer', '&:hover h4': { color: isHighPriority ? 'error.main' : 'primary.main' } }}
                >
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 900,
                            color: 'primary.main',
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

                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                    {latest?.needs_correction && (
                        <Tooltip title="Nội dung báo cáo cần sửa lại">
                            <span>
                                <Avatar sx={{ bgcolor: 'warning.main', width: 24, height: 24, animation: 'pulse 2s infinite' }}>
                                    <IconAlertTriangle size={15} color="white" />
                                </Avatar>
                            </span>
                        </Tooltip>
                    )}
                    {isHighPriority && (
                        <PermissionGuard permission="inundation:finish">
                            <span>
                                <Button
                                    variant="contained"
                                    color="success"
                                    size="small"
                                    disabled={finishing}
                                    startIcon={finishing ? <CircularProgress size={14} color="inherit" /> : <IconChecklist size={14} />}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onQuickFinish) onQuickFinish();
                                    }}
                                    sx={{
                                        height: 32,
                                        borderRadius: 2,
                                        fontWeight: 900,
                                        fontSize: '0.675rem',
                                        px: 1.5,
                                        whiteSpace: 'nowrap',
                                        bgcolor: '#00c853',
                                        boxShadow: '0 4px 12px rgba(0, 200, 83, 0.3)',
                                        pointerEvents: 'auto',
                                        zIndex: 10,
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            bgcolor: '#00a441',
                                            boxShadow: '0 6px 16px rgba(0, 200, 83, 0.4)',
                                            transform: 'translateY(-1px)'
                                        },
                                        '&:active': { transform: 'translateY(0)' }
                                    }}
                                >
                                    {finishing ? 'ĐANG XỬ LÝ...' : 'HẾT NGẬP'}
                                </Button>
                            </span>
                        </PermissionGuard>
                    )}
                </Stack>
            </Stack>
        </Box>
    </Box>
);

export const CardMetrics = ({ isHighPriority, latest, theme }) => (
    <>
        {isHighPriority && (
            <Stack spacing={1.5} sx={{ mb: 2.5 }}>
                <Stack
                    direction="row" spacing={1} alignItems="center"
                    sx={{
                        bgcolor: alpha(theme.palette.secondary.main, 0.03),
                        p: 1, borderRadius: 2, border: '1px solid',
                        borderColor: alpha(theme.palette.secondary.main, 0.1)
                    }}
                >
                    <Box sx={{ bgcolor: 'secondary.main', p: 0.5, borderRadius: 1, display: 'flex' }}>
                        <IconMapPin size={14} color="#fff" />
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        {(latest.length != null || latest.width != null) ? `${latest.length || '?'} x ${latest.width || '?'}` : '---'}
                        <span style={{ color: '#666', fontWeight: 400 }}>x</span>
                        <Box component="span" sx={{
                            fontSize: { xs: '22px', sm: '1.2rem' },
                            color: theme.palette.error.main,
                            fontWeight: 900
                        }}>
                            {latest.depth || 0}
                        </Box>
                    </Typography>
                    <Chip
                        label={latest.traffic_status || 'Đang ngập'}
                        size="small"
                        variant="filled"
                        sx={{
                            height: 20, fontSize: '0.65rem', fontWeight: 900,
                            bgcolor: isHighPriority ? (latest?.flood_level_color || theme.palette.error.main) : theme.palette.success.main,
                            color: '#fff', textTransform: 'uppercase'
                        }}
                    />
                </Stack>

                {latest.survey_checked && (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1 }}>
                        <IconClipboardCheck size={14} color={theme.palette.primary.main} />
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.dark' }}>
                            TK Giám sát: Đã nhận xét
                        </Typography>
                    </Stack>
                )}

                {latest.mech_checked && (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1 }}>
                        <IconEngine size={14} color={theme.palette.secondary.main} />
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'secondary.dark' }}>
                            XN cơ giới: Đã xử lý
                        </Typography>
                    </Stack>
                )}
            </Stack>
        )}
        {!isHighPriority && latest?.updated_at && (
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2, fontStyle: 'italic', opacity: 0.7 }}>
                Cập nhật lần cuối: {new Date(latest.updated_at).toLocaleString()}
            </Typography>
        )}
    </>
);

export const CardActions = ({ expanded, setExpanded, isHighPriority, point, latest, openTask }) => {
    const theme = useTheme();
    const isCorrection = isHighPriority && latest?.needs_correction && !latest?.is_review_updated;

    return (
        <>
            <Divider sx={{ mt: 'auto', mb: 2, borderStyle: 'dashed' }} />
            <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                <Button
                    size="small"
                    color="inherit"
                    startIcon={expanded ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
                    onClick={() => setExpanded(!expanded)}
                    sx={{
                        fontWeight: 800, borderRadius: 2.5, textTransform: 'none',
                        color: 'text.secondary', px: 1.5, '&:hover': { bgcolor: 'grey.100' }
                    }}
                >
                    {expanded ? 'Thu gọn' : 'Chi tiết'}
                </Button>

                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                    <PermissionGuard permission="inundation:report">
                        <Button
                            variant="contained"
                            size="small"
                            color={isCorrection ? 'warning' : 'secondary'}
                            startIcon={isCorrection ? <IconAlertTriangle size={16} /> : <IconSend size={16} />}
                            onClick={() => openTask('REPORT', point)}
                            sx={{
                                borderRadius: 2.5,
                                fontWeight: 900,
                                px: 1.5,
                                animation: isCorrection ? 'aggressiveBlinkButton 1s infinite alternate' : 'none',
                                '@keyframes aggressiveBlinkButton': {
                                    '0%': { transform: 'scale(1)', boxShadow: `0 0 0px ${theme.palette.warning.main}` },
                                    '100%': { transform: 'scale(1.05)', boxShadow: `0 0 15px ${theme.palette.warning.main}` }
                                }
                            }}
                        >
                            {isCorrection ? 'Chỉnh sửa lại điểm ngập' : 'Báo cáo'}
                        </Button>
                    </PermissionGuard>

                    {isHighPriority && (
                        <>
                            <PermissionGuard permission="inundation:survey">
                                <Button
                                    variant="contained" size="small" color="primary"
                                    startIcon={<IconClipboardCheck size={16} />}
                                    onClick={() => openTask('SURVEY', point)}
                                    sx={{ borderRadius: 2.5, fontWeight: 800, px: 1.5 }}
                                >
                                    TK Giám sát
                                </Button>
                            </PermissionGuard>

                            <PermissionGuard permission="inundation:mechanic">
                                <Button
                                    variant="contained" size="small" color="info"
                                    startIcon={<IconEngine size={16} />}
                                    onClick={() => openTask('MECH', point)}
                                    sx={{ borderRadius: 2.5, fontWeight: 800, px: 1.5 }}
                                >
                                    Xí nghiệp Cơ giới
                                </Button>
                            </PermissionGuard>

                            <PermissionGuard permission="inundation:review">
                                <Button
                                    variant="contained" size="small" color="error"
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
        </>
    );
};

export const CardExpandedContent = ({ expanded, latest, isHighPriority, handleOpenViewer }) => (
    <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            {latest ? (
                <Stack spacing={1.5}>
                    {isHighPriority && <ReportInfoSection latest={latest} handleOpenViewer={handleOpenViewer} />}
                    <SurveyInfoSection latest={latest} handleOpenViewer={handleOpenViewer} />
                    <MechInfoSection latest={latest} handleOpenViewer={handleOpenViewer} />
                </Stack>
            ) : (
                <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 3, fontStyle: 'italic' }}>
                    Chưa có dữ liệu vận hành gần nhất
                </Typography>
            )}
        </Box>
    </Collapse>
);
