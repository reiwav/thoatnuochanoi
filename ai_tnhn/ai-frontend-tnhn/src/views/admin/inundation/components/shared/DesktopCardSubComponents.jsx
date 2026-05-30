import React from 'react';
import { Box, Typography, Stack, Grid, IconButton, Tooltip, useTheme, alpha } from '@mui/material';
import { IconClock, IconUser, IconCircleCheck, IconMessageDots, IconEngine, IconClipboardCheck, IconChevronUp, IconChevronDown, IconEye } from '@tabler/icons-react';
import dayjs from 'dayjs';
import PermissionGuard from 'ui-component/PermissionGuard';
import AdminInundationActionMenu from '../AdminInundationActionMenu';
import { getInundationImageUrl } from 'utils/imageHelper';

export const DesktopCardMetrics = ({ lastReport, isFlooded, displayColor, onOpenViewer }) => {
    const theme = useTheme();
    return (
        <>
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
                        <Typography variant="h5" sx={{ fontWeight: 900, fontSize: { xs: '1rem', sm: '1rem' }, color: 'text.primary' }}>{lastReport?.length || '...'}<span style={{ fontSize: '0.75rem', color: '#666', marginLeft: 2 }}></span></Typography>
                    </Grid>
                    <Grid size={{ xs: 3.5 }}>
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.primary', fontWeight: 900, fontSize: { xs: '0.7rem', sm: '0.65rem' }, textTransform: 'uppercase' }}>Rộng</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, fontSize: { xs: '1rem', sm: '1rem' }, color: 'text.primary' }}>{lastReport?.width || '...'}<span style={{ fontSize: '0.75rem', color: '#666', marginLeft: 2 }}></span></Typography>
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
                            {lastReport?.depth ?? '...'}
                            {isFlooded && lastReport?.depth != null && <span style={{ fontSize: '0.7rem', fontWeight: 700, marginLeft: 2, opacity: 0.6 }}></span>}
                        </Typography>
                    </Grid>
                </Grid>
                {(isFlooded || lastReport) && (
                    <Stack spacing={0.75} sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                        {lastReport?.enterprise_history_id && (
                            <Stack direction="row" justifyContent="space-between">
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <IconClock size={13} color={isFlooded ? "#D32F2F" : displayColor} />
                                    <Typography variant="caption" sx={{ fontWeight: 900, color: isFlooded ? "#D32F2F" : displayColor }}>
                                        BC: {lastReport?.ent_updated_at ? dayjs(lastReport.ent_updated_at * 1000).format('HH:mm') : 'Đã BC'}
                                    </Typography>
                                </Stack>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <IconUser size={13} color={isFlooded ? "#D32F2F" : displayColor} />
                                    <Typography variant="caption" sx={{ fontWeight: 900, color: isFlooded ? "#D32F2F" : displayColor }} noWrap>
                                        {lastReport?.user_name || 'N/A'}
                                    </Typography>
                                </Stack>
                            </Stack>
                        )}
                        {lastReport?.mech_history_id && (
                            <Stack direction="row" justifyContent="space-between">
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <IconEngine size={13} color="#7B1FA2" />
                                    <Typography variant="caption" sx={{ fontWeight: 900, color: '#7B1FA2' }}>
                                        XN CG: {lastReport?.mech_updated_at ? dayjs(lastReport.mech_updated_at * 1000).format('HH:mm') : 'Đã trực'}
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
                        {lastReport?.survey_history_id && (
                            <Stack direction="row" justifyContent="space-between">
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <IconClipboardCheck size={13} color="#1976D2" />
                                    <Typography variant="caption" sx={{ fontWeight: 900, color: '#1976D2' }}>
                                        XN KSTK: {lastReport?.survey_updated_at ? dayjs(lastReport.survey_updated_at * 1000).format('HH:mm') : 'Đã KS'}
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
                        {lastReport?.ktcl_history_id && (
                            <Stack direction="row" justifyContent="space-between">
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <IconClipboardCheck size={13} color="#F57C00" />
                                    <Typography variant="caption" sx={{ fontWeight: 900, color: '#F57C00' }}>
                                        P KT-CL: {lastReport?.ktcl_updated_at ? dayjs(lastReport.ktcl_updated_at * 1000).format('HH:mm') : 'Đã BC'}
                                    </Typography>
                                </Stack>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <IconUser size={13} color="#F57C00" />
                                    <Typography variant="caption" sx={{ fontWeight: 900, color: '#F57C00' }} noWrap>
                                        {lastReport?.ktcl_user_name || 'Đã báo cáo'}
                                    </Typography>
                                </Stack>
                            </Stack>
                        )}
                        {lastReport?.review_history_id && (
                            <Stack direction="row" justifyContent="space-between">
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <IconMessageDots size={13} color={theme.palette.error.main} />
                                    <Typography variant="caption" sx={{ fontWeight: 900, color: 'error.main' }}>
                                        Nhận xét: {lastReport?.review_updated_at ? dayjs(lastReport.review_updated_at * 1000).format('HH:mm') : 'Đã nhận xét'}
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
                        {lastReport.images.slice(0, 4).map((img, i) => (
                            <Box
                                key={i}
                                onClick={() => onOpenViewer(lastReport.images, i)}
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
        </>
    );
};

export const DesktopCardFooterActions = ({ point, onOpenDetail, onAction, onOpenHistory, isFlooded }) => {
    const theme = useTheme();
    return (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
            <Tooltip title="Chi tiết">
                <span>
                    <IconButton
                        size="small" color="inherit"
                        onClick={() => onOpenDetail(point)}
                        sx={{ width: 30, height: 30, bgcolor: 'grey.100' }}
                    >
                        <IconEye size={18} />
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
    );
};
