import { useState } from 'react';
import {
    Card, CardContent, Typography, Stack, Chip, Box, Badge, IconButton,
    Divider, Tooltip, useTheme, Grid, Collapse, Button, alpha
} from '@mui/material';
import {
    IconAlertTriangle, IconPhoto, IconClock, IconUser,
    IconMapPin, IconBuildingCommunity, IconRuler2,
    IconChevronDown, IconChevronUp, IconSend, IconClipboardCheck, IconEngine, IconChecklist
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import AdminInundationActionMenu from './AdminInundationActionMenu';
import { SurveyInfoSection, MechInfoSection, ReviewCommentSection, ReportInfoSection } from '../../../employee/inundation/components/TechnicalSections';
import PermissionGuard from 'ui-component/PermissionGuard';

const AdminInundationCard = ({ point, onAction, onOpenViewer, navigate, basePath }) => {
    const theme = useTheme();
    const [expanded, setExpanded] = useState(false);
    const isFlooded = !!point.report_id;
    const report = point.active_report;
    const lastReport = point.last_report;
    const displayColor = isFlooded ? (report?.flood_level_color || theme.palette.error.main) : (lastReport?.flood_level_color || theme.palette.success.main);

    // Determine context for sections
    const latestData = isFlooded ? report : lastReport;
    const isCorrection = isFlooded && report?.needs_correction && !report?.is_review_updated;

    return (
        <Card
            sx={{
                width: '300px',
                minHeight: '220px',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 4,
                border: '1px solid',
                borderColor: isCorrection ? 'warning.main' : (displayColor ? `${displayColor}40` : 'divider'),
                boxShadow: isFlooded ? `0 8px 24px ${displayColor}15` : theme.shadows[1],
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: isCorrection ? alpha(theme.palette.warning.main, 0.02) : '#fff',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 12px 32px ${displayColor}25`
                },
                '&::before': isFlooded ? {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: 4,
                    height: '100%',
                    bgcolor: isCorrection ? 'warning.main' : displayColor
                } : {}
            }}
        >
            {/* Main Header Area: Name + Level + Action Menu */}
            <CardContent sx={{ pt: 2, pb: '8px !important' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
                    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                        <Typography
                            variant="h4"
                            onClick={() => navigate(`${basePath}/inundation/${point.id}`)}
                            sx={{
                                fontWeight: 900,
                                color: isCorrection ? 'warning.dark' : (displayColor || 'primary.main'),
                                lineHeight: 1.2,
                                cursor: 'pointer',
                                wordBreak: 'break-word',
                                display: 'inline-block'
                            }}
                        >
                            {point.name}
                        </Typography>
                    </Box>

                    <Stack direction="row" spacing={0} alignItems="center" sx={{ flexShrink: 0 }}>
                        {report?.images?.length > 0 && (
                            <IconButton size="small" onClick={() => onOpenViewer(report.images)} color="primary" sx={{ p: 0.5 }}>
                                <Badge badgeContent={report.images.length} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 16, minWidth: 16, fontWeight: 800 } }}>
                                    <IconPhoto size={18} />
                                </Badge>
                            </IconButton>
                        )}
                        <AdminInundationActionMenu point={point} onAction={onAction} />
                    </Stack>
                </Box>

                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1.5 }}>
                    <IconMapPin size={12} flexShrink={0} color={theme.palette.text.secondary} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {point.address}
                    </Typography>
                </Stack>

                <Divider sx={{ mb: 2, borderStyle: 'dashed', opacity: 0.5 }} />

                {/* Metrics Area: Dimensions, Depth, and Status */}
                {isFlooded ? (
                    <Stack spacing={1.5}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                            <Stack
                                spacing={0.5} alignItems="center"
                                sx={{ p: 1, borderRadius: 2, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.100', textAlign: 'center' }}
                            >
                                <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', lineHeight: 1 }}>KT (m)</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 900 }}>
                                    {report?.length || '?'}x{report?.width || '?'}
                                </Typography>
                            </Stack>

                            <Stack
                                spacing={0.5} alignItems="center"
                                sx={{
                                    p: 1, borderRadius: 2,
                                    bgcolor: displayColor ? `${displayColor}10` : 'primary.lighter',
                                    border: '1px solid',
                                    borderColor: displayColor ? `${displayColor}20` : 'primary.200',
                                    textAlign: 'center'
                                }}
                            >
                                <Typography variant="overline" sx={{ fontWeight: 800, color: displayColor, lineHeight: 1 }}>Sâu (cm)</Typography>
                                <Typography variant="h5" sx={{ fontWeight: 900, color: displayColor }}>
                                    {report?.depth || 0}
                                </Typography>
                            </Stack>

                            <Stack
                                spacing={0.5} alignItems="center"
                                sx={{
                                    p: 1, borderRadius: 2,
                                    bgcolor: displayColor ? `${displayColor}15` : 'grey.100',
                                    border: '1px solid',
                                    borderColor: displayColor ? `${displayColor}30` : 'transparent',
                                    textAlign: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <IconAlertTriangle size={14} color={displayColor} />
                                <Typography variant="caption" sx={{ fontWeight: 900, color: displayColor, fontSize: '0.625rem', lineHeight: 1 }}>
                                    {report?.flood_level_name || 'Đang ngập'}
                                </Typography>
                            </Stack>
                        </Box>

                        <Box sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 3, border: '1px solid', borderColor: 'grey.100' }}>
                            <Stack direction="row" justifyContent="space-between" spacing={1}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <IconClock size={14} color={theme.palette.text.secondary} />
                                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                        {report?.updated_at ? dayjs(report.updated_at).fromNow() : 'Vừa xong'}
                                    </Typography>
                                </Stack>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <IconUser size={14} color={theme.palette.text.secondary} />
                                    <Typography variant="caption" sx={{ fontWeight: 700 }} noWrap>
                                        {report?.user_name || 'N/A'}
                                    </Typography>
                                </Stack>
                            </Stack>
                        </Box>
                    </Stack>
                ) : (
                    <Box sx={{ py: 2, textAlign: 'center', bgcolor: 'grey.50', border: '1px dashed', borderColor: 'divider', borderRadius: 3 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>Trạng thái ổn định</Typography>
                        {lastReport && lastReport.end_time > 0 && (
                            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
                                Hết ngập: {dayjs(lastReport.end_time * 1000).format('DD/MM HH:mm')}
                            </Typography>
                        )}
                    </Box>
                )}

                {/* Technical Action Buttons (Like Employee Card) */}
                <Box sx={{ mt: 2 }}>
                    <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                        <Button
                            size="small"
                            variant="text"
                            color="inherit"
                            startIcon={expanded ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
                            onClick={() => setExpanded(!expanded)}
                            sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'none' }}
                        >
                            {expanded ? 'Thu gọn' : 'Chi tiết'}
                        </Button>

                        <Stack direction="row" spacing={0.5}>
                            <PermissionGuard permission="inundation:report">
                                <Tooltip title="Gửi báo cáo hiện trường">
                                    <IconButton
                                        size="small" color={isCorrection ? 'warning' : 'secondary'}
                                        onClick={() => onAction('report', point)}
                                        sx={{
                                            bgcolor: isCorrection ? 'warning.lighter' : 'secondary.lighter',
                                            '&:hover': { bgcolor: isCorrection ? 'warning.light' : 'secondary.light' }
                                        }}
                                    >
                                        <IconSend size={18} />
                                    </IconButton>
                                </Tooltip>
                            </PermissionGuard>
                            {isFlooded && (
                                <>
                                    <PermissionGuard permission="inundation:survey">
                                        <Tooltip title="Nhận xét từ Giám sát">
                                            <IconButton size="small" color="primary" onClick={() => onAction('survey', point)} sx={{ bgcolor: 'primary.lighter' }}>
                                                <IconClipboardCheck size={18} />
                                            </IconButton>
                                        </Tooltip>
                                    </PermissionGuard>
                                    <PermissionGuard permission="inundation:mechanic">
                                        <Tooltip title="Thông tin xử lý Cơ giới">
                                            <IconButton size="small" color="info" onClick={() => onAction('mech', point)} sx={{ bgcolor: 'info.lighter' }}>
                                                <IconEngine size={18} />
                                            </IconButton>
                                        </Tooltip>
                                    </PermissionGuard>
                                    <PermissionGuard permission="inundation:review">
                                        <Tooltip title="Ý kiến rà soát của Admin">
                                            <IconButton size="small" color="error" onClick={() => onAction('comment', point)} sx={{ bgcolor: 'error.lighter' }}>
                                                <IconChecklist size={18} />
                                            </IconButton>
                                        </Tooltip>
                                    </PermissionGuard>
                                </>
                            )}
                        </Stack>
                    </Stack>
                </Box>

                {/* Expanded Details Section */}
                <Collapse in={expanded} timeout="auto" unmountOnExit>
                    <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                        {latestData ? (
                            <Stack spacing={2}>
                                {isFlooded && <ReportInfoSection latest={latestData} handleOpenViewer={onOpenViewer} />}
                                <SurveyInfoSection latest={latestData} handleOpenViewer={onOpenViewer} />
                                <MechInfoSection latest={latestData} handleOpenViewer={onOpenViewer} />
                                <ReviewCommentSection latest={latestData} />
                            </Stack>
                        ) : (
                            <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2, fontStyle: 'italic' }}>
                                Chưa có dữ liệu chi tiết
                            </Typography>
                        )}
                    </Box>
                </Collapse>
            </CardContent>
        </Card>
    );
};

export default AdminInundationCard;
