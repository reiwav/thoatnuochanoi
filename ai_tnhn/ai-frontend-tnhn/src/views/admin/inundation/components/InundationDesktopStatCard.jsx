import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, alpha, Stack, Divider, Collapse } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { formatDuration } from 'utils/dataHelper';
import { SurveyInfoSection, MechInfoSection, ReviewCommentSection, ReportInfoSection } from '../../../employee/inundation/components/TechnicalSections';
import { DesktopCardMetrics, DesktopCardFooterActions } from './shared/DesktopCardSubComponents';

const InundationDesktopStatCard = ({ point, onAction, onOpenViewer, onOpenDetail, onOpenHistory, navigate, basePath }) => {
    const theme = useTheme();
    const [expanded, setExpanded] = useState(false);
    const isFlooded = !!point.report_id;
    const lastReport = point.last_report; // Báo cáo mới nhất (luôn có)
    const displayColor = isFlooded ? (lastReport?.flood_level_color || theme.palette.error.main) : (lastReport?.flood_level_color || theme.palette.success.main);

    return (
        <Card sx={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 4,
            boxShadow: isFlooded ? `0 8px 24px ${displayColor}15` : '0 4px 12px rgba(0,0,0,0.05)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            border: '1.5px solid',
            borderColor: isFlooded ? alpha(displayColor, 0.3) : 'divider',
            overflow: 'hidden',
            '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: isFlooded ? `0 12px 32px ${displayColor}25` : '0 8px 24px rgba(0,0,0,0.1)',
            }
        }}>
            <CardContent sx={{ p: 1.5, pb: '12px !important', textAlign: 'center', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Title */}
                    <Box sx={{ mb: 0.5 }}>
                        <Typography
                            variant="h5"
                            onClick={() => onOpenDetail(point)}
                            sx={{
                                color: isFlooded ? 'error.main' : 'primary.main',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                lineHeight: 1.1,
                                cursor: 'pointer',
                                minHeight: '2.2em',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                fontSize: '0.9rem'
                            }}
                        >
                            {point.name}
                        </Typography>
                    </Box>

                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 900, display: 'block', mb: 0.25, fontSize: '0.68rem', textTransform: 'uppercase' }}>
                        {point.org_name || 'Đơn vị quản lý'}
                    </Typography>

                    <Typography variant="caption" sx={{ color: 'text.primary', display: 'block', mb: 0.75, fontWeight: 600, minHeight: '2.4em', lineHeight: 1.1, fontSize: '0.68rem' }}>
                        {point.address}
                    </Typography>

                    {/* Status Indicator & Time Label */}
                    <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.1, borderRadius: 1.5, bgcolor: alpha(displayColor, 0.1) }}>
                            <Box sx={{
                                width: 6, height: 6, borderRadius: '50%',
                                bgcolor: displayColor,
                                boxShadow: isFlooded ? `0 0 6px ${displayColor}` : 'none',
                                animation: isFlooded ? 'stat-pulse 2s infinite' : 'none'
                            }} />
                            <Typography variant="caption" sx={{ fontWeight: 800, color: displayColor, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                                {isFlooded ? (lastReport?.flood_level_name || 'Đang ngập') : 'Bình thường'}
                            </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 700, fontSize: '0.65rem' }}>
                            {isFlooded ? formatDuration(lastReport?.created_at) : ''}
                        </Typography>
                    </Box>

                    {/* Enhanced Metrics Display */}
                    <DesktopCardMetrics lastReport={lastReport} isFlooded={isFlooded} displayColor={displayColor} onOpenViewer={onOpenViewer} />
                </Box>

                {/* Footer Quick Actions */}
                <DesktopCardFooterActions
                    point={point} expanded={expanded} setExpanded={setExpanded}
                    onAction={onAction} onOpenHistory={onOpenHistory} isFlooded={isFlooded}
                />
            </CardContent>

            <Collapse in={expanded} timeout="auto" unmountOnExit>
                <Divider sx={{ borderStyle: 'dashed' }} />
                <Box sx={{ p: 1.5, bgcolor: 'grey.50', textAlign: 'left' }}>
                    {isFlooded && lastReport ? (
                        <Stack spacing={1.5}>
                            <ReportInfoSection latest={lastReport} handleOpenViewer={onOpenViewer} />
                            <ReviewCommentSection report={lastReport} />
                            <MechInfoSection latest={lastReport} />
                            <SurveyInfoSection latest={lastReport} />
                        </Stack>
                    ) : (
                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center' }}>
                            {lastReport ? 'Trạng thái bình thường. Xem chi tiết đợt ngập trong phần Lịch sử.' : 'Không có dữ liệu chi tiết'}
                        </Typography>
                    )}
                </Box>
            </Collapse>

            <style>
                {`
                @keyframes stat-pulse {
                    0% { box-shadow: 0 0 0 0 ${alpha(displayColor, 0.7)}; }
                    70% { box-shadow: 0 0 0 6px ${alpha(displayColor, 0)}; }
                    100% { box-shadow: 0 0 0 0 ${alpha(displayColor, 0)}; }
                }
                `}
            </style>
        </Card>
    );
};

export default InundationDesktopStatCard;
