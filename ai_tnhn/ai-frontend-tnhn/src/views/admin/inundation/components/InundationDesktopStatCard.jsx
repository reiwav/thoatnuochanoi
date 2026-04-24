import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, alpha, Stack, Divider, Collapse, Tooltip, IconButton, Grid } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconCircleCheck, IconChevronDown, IconChevronUp, IconMessageDots } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { getInundationImageUrl } from 'utils/imageHelper';
import PermissionGuard from 'ui-component/PermissionGuard';
import { SurveyInfoSection, MechInfoSection, ReviewCommentSection, ReportInfoSection } from '../../../employee/inundation/components/TechnicalSections';
import AdminInundationActionMenu from './AdminInundationActionMenu';

const InundationDesktopStatCard = ({ point, onAction, onOpenViewer, onOpenDetail, navigate, basePath }) => {
    const theme = useTheme();
    const [expanded, setExpanded] = useState(false);
    const isFlooded = !!point.report_id;
    const report = point.active_report;
    const lastReport = point.last_report;
    const displayColor = isFlooded ? (report?.flood_level_color || theme.palette.error.main) : theme.palette.success.main;

    return (
        <Card sx={{
            height: 'fit-content',
            width: 280,
            borderRadius: 4,
            boxShadow: isFlooded ? `0 8px 24px ${displayColor}15` : '0 4px 12px rgba(0,0,0,0.05)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            border: '1.5px solid',
            borderColor: isFlooded ? alpha(displayColor, 0.3) : 'divider',
            overflow: 'hidden',
            mx: 'auto',
            '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: isFlooded ? `0 12px 32px ${displayColor}25` : '0 8px 24px rgba(0,0,0,0.1)',
            }
        }}>
            <CardContent sx={{ p: 1.5, pb: '12px !important', textAlign: 'center' }}>
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

                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, display: 'block', mb: 0.25, fontSize: '0.68rem', textTransform: 'uppercase' }}>
                    {point.org_name || 'Đơn vị quản lý'}
                </Typography>

                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.75, fontStyle: 'italic', minHeight: '2.4em', lineHeight: 1.1, fontSize: '0.68rem' }}>
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
                            {isFlooded ? (report?.flood_level_name || 'Đang ngập') : 'Bình thường'}
                        </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.65rem' }}>
                        {isFlooded ? dayjs((report?.updated_at || report?.start_time) * 1000).fromNow() : (lastReport?.end_time ? dayjs(lastReport.end_time * 1000).format('DD/MM HH:mm') : '-')}
                    </Typography>
                </Box>

                {/* Enhanced Metrics Display */}
                <Box sx={{ 
                    mb: 2, p: 1, 
                    borderRadius: 3, 
                    bgcolor: isFlooded ? alpha(displayColor, 0.05) : 'grey.50',
                    border: '1px solid',
                    borderColor: isFlooded ? alpha(displayColor, 0.1) : 'divider'
                }}>
                    <Grid container spacing={0.5} sx={{ alignItems: 'center' }}>
                        <Grid size={{ xs: 3.5 }}>
                            <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', fontWeight: 800, fontSize: { xs: '0.5rem', sm: '0.55rem' }, textTransform: 'uppercase' }}>Dài</Typography>
                            <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>{isFlooded ? report.length : '...'}<span style={{ fontSize: '0.6rem', color: '#aaa', marginLeft: 2 }}>{isFlooded ? 'm' : ''}</span></Typography>
                        </Grid>
                        <Grid size={{ xs: 3.5 }}>
                            <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', fontWeight: 800, fontSize: { xs: '0.5rem', sm: '0.55rem' }, textTransform: 'uppercase' }}>Rộng</Typography>
                            <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>{isFlooded ? report.width : '...'}<span style={{ fontSize: '0.6rem', color: '#aaa', marginLeft: 2 }}>{isFlooded ? 'm' : ''}</span></Typography>
                        </Grid>
                        <Grid size={{ xs: 5 }} sx={{ borderLeft: '1px solid', borderColor: 'divider', pl: 1 }}>
                            <Typography variant="caption" sx={{ display: 'block', color: isFlooded ? displayColor : 'text.disabled', fontWeight: 900, fontSize: { xs: '0.5rem', sm: '0.55rem' }, textTransform: 'uppercase' }}>Chiều sâu</Typography>
                            <Typography 
                                variant="h2" 
                                sx={{ 
                                    fontWeight: 900, 
                                    color: isFlooded ? displayColor : 'text.disabled',
                                    fontSize: { xs: '1.2rem', sm: '1.4rem' },
                                    lineHeight: 1
                                }}
                            >
                                {isFlooded ? report.depth : '...'}
                                {isFlooded && <span style={{ fontSize: '0.7rem', fontWeight: 700, marginLeft: 2, opacity: 0.6 }}>cm</span>}
                            </Typography>
                        </Grid>
                    </Grid>
                </Box>

                {/* Image Previews */}
                {report?.images?.length > 0 && (
                    <Box sx={{ mb: 1.5 }}>
                        <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ overflow: 'hidden' }}>
                            {report.images.slice(0, 4).map((img, i) => (
                                <Box
                                    key={i}
                                    onClick={() => onOpenViewer(report.images, i)}
                                    sx={{
                                        width: 32, height: 32, borderRadius: 1, overflow: 'hidden', cursor: 'pointer',
                                        border: '1px solid', borderColor: 'divider',
                                        '&:hover': { opacity: 0.8 }
                                    }}
                                >
                                    <img src={getInundationImageUrl(img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </Box>
                            ))}
                        </Stack>
                    </Box>
                )}

                {/* Footer Quick Actions */}
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
                    <Tooltip title="Chi tiết">
                        <span>
                            <IconButton
                                size="small" color={expanded ? "primary" : "inherit"}
                                onClick={() => setExpanded(!expanded)}
                                sx={{ width: 30, height: 30, bgcolor: expanded ? alpha(theme.palette.primary.main, 0.1) : 'grey.100' }}
                            >
                                {expanded ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
                            </IconButton>
                        </span>
                    </Tooltip>

                    <Box sx={{ flex: 1 }} />

                    <PermissionGuard permission="inundation:review">
                        <Tooltip title="Nhận xét">
                            <span>
                                <IconButton
                                    size="small" color="error"
                                    onClick={() => onAction('comment', point)}
                                    sx={{ width: 30, height: 30, bgcolor: alpha(theme.palette.error.main, 0.05) }}
                                >
                                    <IconMessageDots size={18} />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </PermissionGuard>

                    <PermissionGuard permission="inundation:review">
                        <Tooltip title="Kết thúc nhanh">
                            <IconButton
                                size="small" color="success" disabled={!isFlooded}
                                onClick={() => onAction('quick_finish', point)}
                                sx={{ width: 30, height: 30, bgcolor: alpha(theme.palette.success.main, 0.05) }}
                            >
                                <IconCircleCheck size={18} />
                            </IconButton>
                        </Tooltip>
                    </PermissionGuard>

                    <AdminInundationActionMenu
                        point={point}
                        onAction={onAction}
                        sx={{ width: 30, height: 30 }}
                        onViewHistory={(p) => navigate(`${basePath}/station/inundation/history?id=${p.id}`)}
                    />
                </Stack>
            </CardContent>

            <Collapse in={expanded} timeout="auto" unmountOnExit>
                <Divider sx={{ borderStyle: 'dashed' }} />
                <Box sx={{ p: 1.5, bgcolor: 'grey.50', textAlign: 'left' }}>
                    {(isFlooded ? report : lastReport) ? (
                        <Stack spacing={1.5}>
                            <ReportInfoSection latest={isFlooded ? report : lastReport} handleOpenViewer={onOpenViewer} />
                            <ReviewCommentSection report={isFlooded ? report : lastReport} />
                            <MechInfoSection latest={isFlooded ? report : lastReport} />
                            <SurveyInfoSection latest={isFlooded ? report : lastReport} />
                        </Stack>
                    ) : (
                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center' }}>Không có dữ liệu chi tiết</Typography>
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
