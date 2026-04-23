import { useState } from 'react';
import {
    Card, CardContent, Typography, Stack, Chip, Box, Badge, IconButton,
    Divider, Tooltip, useTheme, Grid, Collapse, Button, alpha
} from '@mui/material';
import {
    IconAlertTriangle, IconPhoto, IconClock, IconUser,
    IconMapPin, IconBuildingCommunity,
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
                //height: 'min-content',
                minHeight: '280px',
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
            {/* Header: Status and Quick Actions */}
            <Box sx={{ p: 1.5, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Chip
                    label={isFlooded ? (report?.flood_level_name || 'Đang ngập') : 'Bình thường'}
                    size="small"
                    sx={{
                        fontWeight: 800,
                        px: 1,
                        bgcolor: displayColor ? `${displayColor}15` : 'grey.100',
                        color: displayColor,
                        border: '1px solid',
                        borderColor: displayColor ? `${displayColor}30` : 'transparent'
                    }}
                />
                <Stack direction="row" spacing={0.5}>
                    {report?.images?.length > 0 && (
                        <IconButton size="small" onClick={() => onOpenViewer(report.images)} color="primary">
                            <Badge badgeContent={report.images.length} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 16, minWidth: 16, fontWeight: 800 } }}>
                                <IconPhoto size={18} />
                            </Badge>
                        </IconButton>
                    )}
                    <AdminInundationActionMenu point={point} onAction={onAction} />
                </Stack>
            </Box>

            <CardContent sx={{ pt: 0, pb: '16px !important', flexGrow: 1 }}>
                {/* Point Basic Info */}
                <Box
                    onClick={() => navigate(`${basePath}/inundation/${point.id}`)}
                    sx={{ cursor: 'pointer', mb: 2 }}
                >
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 900,
                            mb: 0.5,
                            color: isCorrection ? 'warning.dark' : (displayColor || 'primary.main'),
                            lineHeight: 1.2
                        }}
                    >
                        {point.name}
                    </Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                        <IconMapPin size={14} flexShrink={0} color={theme.palette.text.secondary} />
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }} noWrap>
                            {point.address}
                        </Typography>
                    </Stack>
                </Box>

                <Divider sx={{ mb: 2, borderStyle: 'dashed', opacity: 0.5 }} />

                {/* Metrics Area */}
                {isFlooded ? (
                    <Stack spacing={2}>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <Stack
                                    sx={{
                                        p: 1, borderRadius: 2.5,
                                        bgcolor: 'grey.50',
                                        border: '1px solid',
                                        borderColor: 'grey.100'
                                    }}
                                >
                                    <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', lineHeight: 1, mb: 0.5 }}>Kích thước</Typography>
                                    <Typography variant="h5" sx={{ fontWeight: 900 }}>
                                        {report?.length || '?'}x{report?.width || '?'}m
                                    </Typography>
                                </Stack>
                            </Grid>
                            <Grid item xs={6}>
                                <Stack
                                    sx={{
                                        p: 1, borderRadius: 2.5,
                                        bgcolor: displayColor ? `${displayColor}10` : 'primary.lighter',
                                        border: '1px solid',
                                        borderColor: displayColor ? `${displayColor}20` : 'primary.200'
                                    }}
                                >
                                    <Typography variant="overline" sx={{ fontWeight: 800, color: displayColor, lineHeight: 1, mb: 0.5 }}>Độ sâu</Typography>
                                    <Typography variant="h4" sx={{ fontWeight: 900, color: displayColor }}>
                                        {report?.depth || 0} cm
                                    </Typography>
                                </Stack>
                            </Grid>
                        </Grid>

                        <Box sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 3, border: '1px solid', borderColor: 'grey.100' }}>
                            <Stack direction="row" justifyContent="space-between" spacing={1}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <IconClock size={14} color={theme.palette.text.secondary} />
                                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                        {dayjs(report?.timestamp * 1000).fromNow()}
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
                        {lastReport && (
                            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
                                Hết ngập: {dayjs(lastReport.end_time).format('DD/MM HH:mm')}
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
