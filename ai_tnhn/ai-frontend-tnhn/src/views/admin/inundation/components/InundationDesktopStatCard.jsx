import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, alpha, Stack, Divider, Collapse, Tooltip, IconButton, Grid } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconCircleCheck, IconChevronDown, IconChevronUp, IconMessageDots, IconClock, IconUser, IconEngine, IconClipboardCheck } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { getInundationImageUrl } from 'utils/imageHelper';
import { formatDuration } from 'utils/dataHelper';
import PermissionGuard from 'ui-component/PermissionGuard';
import { SurveyInfoSection, MechInfoSection, ReviewCommentSection, ReportInfoSection } from '../../../employee/inundation/components/TechnicalSections';
import AdminInundationActionMenu from './AdminInundationActionMenu';

const InundationDesktopStatCard = ({ point, onAction, onOpenViewer, onOpenDetail, onOpenHistory, navigate, basePath }) => {
    const theme = useTheme();
    const [expanded, setExpanded] = useState(false);
    const isFlooded = !!point.report_id;
    const lastReport = point.last_report; // Báo cáo mới nhất (luôn có)
    const displayColor = isFlooded ? (lastReport?.flood_level_color || theme.palette.error.main) : theme.palette.success.main;

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
                                fontSize: '1.05rem'
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
                    <Box sx={{
                        mb: 2, p: 1,
                        borderRadius: 3,
                        bgcolor: isFlooded ? alpha(displayColor, 0.05) : 'grey.50',
                        border: '1px solid',
                        borderColor: isFlooded ? alpha(displayColor, 0.1) : 'divider'
                    }}>
                        <Grid container spacing={0.5} sx={{ alignItems: 'center' }}>
                            <Grid size={{ xs: 3.5 }}>
                                <Typography variant="caption" sx={{ display: 'block', color: 'text.primary', fontWeight: 900, fontSize: { xs: '0.7rem', sm: '0.65rem' }, textTransform: 'uppercase' }}>Dài</Typography>
                                <Typography variant="h5" sx={{ fontWeight: 900, fontSize: { xs: '1rem', sm: '1rem' }, color: 'text.primary' }}>{lastReport?.length || '...'}<span style={{ fontSize: '0.75rem', color: '#666', marginLeft: 2 }}>{lastReport?.length ? 'm' : ''}</span></Typography>
                            </Grid>
                            <Grid size={{ xs: 3.5 }}>
                                <Typography variant="caption" sx={{ display: 'block', color: 'text.primary', fontWeight: 900, fontSize: { xs: '0.7rem', sm: '0.65rem' }, textTransform: 'uppercase' }}>Rộng</Typography>
                                <Typography variant="h5" sx={{ fontWeight: 900, fontSize: { xs: '1rem', sm: '1rem' }, color: 'text.primary' }}>{lastReport?.width || '...'}<span style={{ fontSize: '0.75rem', color: '#666', marginLeft: 2 }}>{lastReport?.width ? 'm' : ''}</span></Typography>
                            </Grid>
                            <Grid size={{ xs: 5 }} sx={{ borderLeft: '1px solid', borderColor: 'divider', pl: 1 }}>
                                <Typography variant="caption" sx={{ display: 'block', color: 'text.primary', fontWeight: 900, fontSize: { xs: '0.7rem', sm: '0.65rem' }, textTransform: 'uppercase' }}>Sâu</Typography>
                                <Typography
                                    variant="h2"
                                    sx={{
                                        fontWeight: 900,
                                        color: isFlooded ? displayColor : 'text.primary',
                                        fontSize: { xs: '22px', sm: '1.6rem' },
                                        lineHeight: 1
                                    }}
                                >
                                    {lastReport?.depth || (lastReport?.depth === 0 ? '0' : '...')}
                                    {lastReport?.depth != null && <span style={{ fontSize: '0.7rem', fontWeight: 700, marginLeft: 2, opacity: 0.6 }}>cm</span>}
                                </Typography>
                            </Grid>
                        </Grid>
                        {isFlooded && (
                            <Stack spacing={0.75} sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                                <Stack direction="row" justifyContent="space-between">
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                        <IconClock size={13} color="#D32F2F" />
                                        <Typography variant="caption" sx={{ fontWeight: 900, color: '#D32F2F' }}>
                                            BC: {lastReport?.created_at ? dayjs(lastReport.created_at * 1000).format('HH:mm') : '...'}
                                        </Typography>
                                    </Stack>
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                        <IconUser size={13} color="#D32F2F" />
                                        <Typography variant="caption" sx={{ fontWeight: 900, color: '#D32F2F' }} noWrap>
                                            {lastReport?.user_name || 'N/A'}
                                        </Typography>
                                    </Stack>
                                </Stack>
                                {(lastReport?.mech_checked || lastReport?.mech_images?.length > 0) && (
                                    <Stack direction="row" justifyContent="space-between">
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            <IconEngine size={13} color="#7B1FA2" />
                                            <Typography variant="caption" sx={{ fontWeight: 900, color: '#7B1FA2' }}>
                                                CG: {lastReport?.mech_updated_at ? dayjs(lastReport.mech_updated_at * 1000).format('HH:mm') : (lastReport?.mech_checked ? 'Đã trực' : '...')}
                                            </Typography>
                                        </Stack>
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            <IconUser size={13} color="#7B1FA2" />
                                            <Typography variant="caption" sx={{ fontWeight: 900, color: '#7B1FA2' }} noWrap>
                                                {lastReport?.mech_user_name || 'Sẵn sàng'}
                                            </Typography>
                                        </Stack>
                                    </Stack>
                                )}
                                {(lastReport?.survey_checked || lastReport?.survey_images?.length > 0) && (
                                    <Stack direction="row" justifyContent="space-between">
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            <IconClipboardCheck size={13} color="#1976D2" />
                                            <Typography variant="caption" sx={{ fontWeight: 900, color: '#1976D2' }}>
                                                KS: {lastReport?.survey_updated_at ? dayjs(lastReport.survey_updated_at * 1000).format('HH:mm') : (lastReport?.survey_checked ? 'Đã KS' : '...')}
                                            </Typography>
                                        </Stack>
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            <IconUser size={13} color="#1976D2" />
                                            <Typography variant="caption" sx={{ fontWeight: 900, color: '#1976D2' }} noWrap>
                                                {lastReport?.survey_user_name || 'Đã kiểm tra'}
                                            </Typography>
                                        </Stack>
                                    </Stack>
                                )}
                                {lastReport?.review_comment && (
                                    <Stack direction="row" justifyContent="space-between">
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            <IconMessageDots size={13} color={theme.palette.error.main} />
                                            <Typography variant="caption" sx={{ fontWeight: 900, color: 'error.main' }}>
                                                P. KT-CL: Đã nhận xét
                                            </Typography>
                                        </Stack>
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            <IconUser size={13} color={theme.palette.error.main} />
                                            <Typography variant="caption" sx={{ fontWeight: 900, color: 'error.main' }} noWrap>
                                                {lastReport?.reviewer_name || 'N/A'}
                                            </Typography>
                                        </Stack>
                                    </Stack>
                                )}
                            </Stack>
                        )}
                    </Box>

                    {/* Image Previews */}
                    {lastReport?.images?.length > 0 && (
                        <Box sx={{ mb: 1.5 }}>
                            <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ overflow: 'hidden' }}>
                                {lastReport?.images?.slice(0, 4).map((img, i) => (
                                    <Box
                                        key={i}
                                        onClick={() => onOpenViewer(lastReport?.images, i)}
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
                </Box>

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
                            <span>
                                <IconButton
                                    size="small" color="success" disabled={!isFlooded}
                                    onClick={() => onAction('quick_finish', point)}
                                    sx={{ width: 30, height: 30, bgcolor: alpha(theme.palette.success.main, 0.05) }}
                                >
                                    <IconCircleCheck size={18} />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </PermissionGuard>

                    <AdminInundationActionMenu
                        point={point}
                        onAction={onAction}
                        sx={{ width: 30, height: 30 }}
                        onViewHistory={() => onOpenHistory(point)}
                    />
                </Stack>
            </CardContent>

            <Collapse in={expanded} timeout="auto" unmountOnExit>
                <Divider sx={{ borderStyle: 'dashed' }} />
                <Box sx={{ p: 1.5, bgcolor: 'grey.50', textAlign: 'left' }}>
                    {lastReport ? (
                        <Stack spacing={1.5}>
                            <ReportInfoSection latest={lastReport} handleOpenViewer={onOpenViewer} />
                            <ReviewCommentSection report={lastReport} />
                            <MechInfoSection latest={lastReport} />
                            <SurveyInfoSection latest={lastReport} />
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
