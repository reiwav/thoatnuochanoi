import { useState } from 'react';
import {
    Card, CardContent, Typography, Stack, Box, IconButton,
    useTheme, Collapse, Button, alpha
} from '@mui/material';
import {
    IconMapPin, IconChevronDown, IconChevronUp
} from '@tabler/icons-react';
import AdminInundationActionMenu from './AdminInundationActionMenu';
import { SurveyInfoSection, MechInfoSection, ReviewCommentSection, ReportInfoSection, KtclInfoSection } from '../../../employee/inundation/components/TechnicalSections';
import { AdminCardMetrics, AdminCardNormalState, AdminCardActionButtons } from './shared/AdminCardSubComponents';

const AdminInundationCard = ({ point, onAction, onOpenViewer, onOpenDetail, onOpenHistory, navigate, basePath }) => {
    const theme = useTheme();
    const [expanded, setExpanded] = useState(false);
    const isFlooded = !!point.report_id;
    const report = point.last_report;
    const lastReport = point.last_report;
    const displayColor = isFlooded ? (report?.flood_level_color || theme.palette.error.main) : (lastReport?.flood_level_color || theme.palette.success.main);

    // Determine context for sections
    const latestData = isFlooded ? report : lastReport;
    const isCorrection = isFlooded && report?.needs_correction && !report?.is_review_updated;

    return (
        <Card
            sx={{
                width: { xs: '100%', sm: '300px' },
                // minWidth: { xs: '300px', sm: '300px' },
                height: '100%',
                margin: 'auto',
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
                            onClick={() => onOpenDetail(point)}
                            sx={{
                                fontWeight: 900,
                                color: 'primary.main',
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
                        <AdminInundationActionMenu
                            point={point}
                            onAction={onAction}
                            onViewHistory={() => onOpenHistory(point)}
                        />
                    </Stack>
                </Box>

                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1.5 }}>
                    <IconMapPin size={12} flexShrink={0} color={theme.palette.text.secondary} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {point.address}
                    </Typography>
                </Stack>

                {isFlooded ? (
                    <AdminCardMetrics report={report} displayColor={displayColor} onOpenViewer={onOpenViewer} />
                ) : (
                    <AdminCardNormalState lastReport={lastReport} displayColor={displayColor} onOpenViewer={onOpenViewer} />
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

                        <AdminCardActionButtons point={point} onAction={onAction} isFlooded={isFlooded} isCorrection={isCorrection} />
                    </Stack>
                </Box>

                {/* Expanded Details Section */}
                <Collapse in={expanded} timeout="auto" unmountOnExit>
                    <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                        {isFlooded && latestData ? (
                            <Stack spacing={2}>
                                <ReportInfoSection latest={latestData} handleOpenViewer={onOpenViewer} />
                                <SurveyInfoSection latest={latestData} handleOpenViewer={onOpenViewer} />
                                <MechInfoSection latest={latestData} handleOpenViewer={onOpenViewer} />
                                <KtclInfoSection latest={latestData} handleOpenViewer={onOpenViewer} />
                                <ReviewCommentSection latest={latestData} />
                            </Stack>
                        ) : (
                            <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2, fontStyle: 'italic' }}>
                                {latestData ? 'Trạng thái bình thường. Xem chi tiết đợt ngập trong phần Lịch sử.' : 'Chưa có dữ liệu chi tiết'}
                            </Typography>
                        )}
                    </Box>
                </Collapse>
            </CardContent>
        </Card>
    );
};

export default AdminInundationCard;
