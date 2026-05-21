import React from 'react';
import { Box, Typography, Stack, Grid, Chip, IconButton, Tooltip, useTheme } from '@mui/material';
import { IconClock, IconUser, IconCircleCheck, IconSend, IconClipboardCheck, IconEngine, IconChecklist } from '@tabler/icons-react';
import dayjs from 'dayjs';
import PermissionGuard from 'ui-component/PermissionGuard';
import { getInundationImageUrl } from 'utils/imageHelper';

export const AdminCardMetrics = ({ report, displayColor, onOpenViewer }) => {
    const theme = useTheme();
    return (
        <Stack spacing={1.5}>
            {/* Compact Metrics: Dài x Rộng x Sâu */}
            <Box sx={{
                p: 1.5,
                borderRadius: 3,
                border: '1px solid',
                borderColor: `${displayColor}30`,
                bgcolor: `${displayColor}08`,
                position: 'relative',
                overflow: 'hidden'
            }}>
                <Grid container spacing={1} alignItems="center">
                    <Grid size={{ xs: 2.5 }}>
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase' }}>Dài</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800 }}>{report?.length || '0'}<span style={{ fontSize: '0.6rem', color: '#999', marginLeft: 1 }}>m</span></Typography>
                    </Grid>
                    <Grid size={{ xs: 2.5 }}>
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase' }}>Rộng</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800 }}>{report?.width || '0'}<span style={{ fontSize: '0.6rem', color: '#999', marginLeft: 1 }}>m</span></Typography>
                    </Grid>
                    <Grid size={{ xs: 3 }} sx={{ borderLeft: '1px solid', borderColor: `${displayColor}20`, pl: 1 }}>
                        <Typography variant="caption" sx={{ display: 'block', color: displayColor, fontWeight: 800, fontSize: '0.6rem', textTransform: 'uppercase' }}>Sâu</Typography>
                        <Typography variant="h3" sx={{ fontWeight: 900, color: displayColor, lineHeight: 1 }}>{report?.depth || '0'}<span style={{ fontSize: '0.6rem', opacity: 0.7, marginLeft: 2 }}></span></Typography>
                    </Grid>
                    <Grid size={{ xs: 4 }} sx={{ textAlign: 'right' }}>
                        <Chip
                            label={report?.flood_level_name || 'Đang ngập'}
                            size="small"
                            sx={{
                                height: 20, fontSize: '0.6rem', fontWeight: 900,
                                bgcolor: displayColor, color: '#fff',
                                '& .MuiChip-label': { px: 0.8 }
                            }}
                        />
                    </Grid>
                </Grid>
            </Box>

            {/* Image List (Thumbnails) */}
            {report?.images?.length > 0 && (
                <Box>
                    <Stack direction="row" spacing={0.5} sx={{ overflowX: 'auto', pt: 0.5, pb: 0.5, '&::-webkit-scrollbar': { height: 4, bgcolor: 'transparent' }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 10 } }}>
                        {report.images.map((img, i) => (
                            <Box
                                key={i}
                                onClick={() => onOpenViewer(report.images, i)}
                                sx={{
                                    width: 48, height: 48, borderRadius: 1.5, overflow: 'hidden', flexShrink: 0, cursor: 'pointer',
                                    border: '1.5px solid', borderColor: 'divider', transition: 'all 0.2s',
                                    '&:hover': { transform: 'scale(1.05)', borderColor: displayColor }
                                }}
                            >
                                <img src={getInundationImageUrl(img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </Box>
                        ))}
                    </Stack>
                </Box>
            )}
            <Box sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 3, border: '1px solid', borderColor: 'grey.100' }}>
                <Stack direction="row" justifyContent="space-between" spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <IconClock size={14} color={theme.palette.text.secondary} />
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            {report?.updated_at && dayjs(report.updated_at * 1000).year() > 2000 ? dayjs(report.updated_at * 1000).fromNow() : 'Vừa xong'}
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
    );
};

export const AdminCardNormalState = ({ lastReport, displayColor, onOpenViewer }) => {
    const theme = useTheme();
    return (
        <Stack spacing={1.5}>
            <Box sx={{
                p: 1.5,
                borderRadius: 3,
                border: '1px dashed',
                borderColor: `${displayColor}60`,
                bgcolor: `${displayColor}10`,
                position: 'relative'
            }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                        <IconCircleCheck size={20} color={displayColor} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: displayColor }}>
                            {lastReport?.flood_level_name || 'Bình thường'}
                        </Typography>
                    </Stack>
                    {lastReport && lastReport.end_time > 0 && !lastReport.user_name && (
                        <Typography variant="caption" sx={{ fontWeight: 600, color: displayColor, opacity: 0.8 }}>
                            Hết ngập: {dayjs(lastReport.end_time * 1000).format('DD/MM HH:mm')}
                        </Typography>
                    )}
                </Stack>
                {lastReport && lastReport.description && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary', fontStyle: 'italic' }}>
                        "{lastReport.description}"
                    </Typography>
                )}
            </Box>

            {/* Image List (Thumbnails) for Normal state */}
            {lastReport?.images?.length > 0 && (
                <Box>
                    <Stack direction="row" spacing={0.5} sx={{ overflowX: 'auto', pt: 0.5, pb: 0.5, '&::-webkit-scrollbar': { height: 4, bgcolor: 'transparent' }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 10 } }}>
                        {lastReport.images.map((img, i) => (
                            <Box
                                key={i}
                                onClick={() => onOpenViewer(lastReport.images, i)}
                                sx={{
                                    width: 48, height: 48, borderRadius: 1.5, overflow: 'hidden', flexShrink: 0, cursor: 'pointer',
                                    border: '1.5px solid', borderColor: 'divider', transition: 'all 0.2s',
                                    '&:hover': { transform: 'scale(1.05)', borderColor: displayColor }
                                }}
                            >
                                <img src={getInundationImageUrl(img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </Box>
                        ))}
                    </Stack>
                </Box>
            )}

            <Box sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 3, border: '1px solid', borderColor: 'grey.100' }}>
                <Stack direction="row" justifyContent="space-between" spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <IconClock size={14} color={theme.palette.text.secondary} />
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            {lastReport?.updated_at ? dayjs(lastReport.updated_at * 1000).fromNow() : 'Chưa có thông tin'}
                        </Typography>
                    </Stack>
                    {lastReport?.user_name && (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                            <IconUser size={14} color={theme.palette.text.secondary} />
                            <Typography variant="caption" sx={{ fontWeight: 700 }} noWrap>
                                {lastReport.user_name}
                            </Typography>
                        </Stack>
                    )}
                </Stack>
            </Box>
        </Stack>
    );
};

export const AdminCardActionButtons = ({ point, onAction, isFlooded, isCorrection }) => {
    return (
        <Stack direction="row" spacing={0.5}>
            <PermissionGuard permission="inundation:report">
                <Tooltip title="Gửi báo cáo hiện trường">
                    <span>
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
                    </span>
                </Tooltip>
            </PermissionGuard>
            <PermissionGuard permission="inundation:review">
                <Tooltip title="Kết thúc nhanh">
                    <span>
                        <IconButton
                            size="small" color="success"
                            disabled={!isFlooded}
                            onClick={() => onAction('quick_finish', point)}
                            sx={{ bgcolor: 'success.lighter', '&:hover': { bgcolor: 'success.light' } }}
                        >
                            <IconCircleCheck size={18} />
                        </IconButton>
                    </span>
                </Tooltip>
            </PermissionGuard>
            <PermissionGuard permission="inundation:survey">
                <Tooltip title="XN KSTK">
                    <span>
                        <IconButton size="small" color="primary" onClick={() => onAction('survey', point)} sx={{ bgcolor: 'primary.lighter' }}>
                            <IconClipboardCheck size={18} />
                        </IconButton>
                    </span>
                </Tooltip>
            </PermissionGuard>
            <PermissionGuard permission="inundation:mechanic">
                <Tooltip title="XN cơ giới">
                    <span>
                        <IconButton size="small" color="info" onClick={() => onAction('mech', point)} sx={{ bgcolor: 'info.lighter' }}>
                            <IconEngine size={18} />
                        </IconButton>
                    </span>
                </Tooltip>
            </PermissionGuard>
            <PermissionGuard permission="inundation:review">
                <Tooltip title="Nhận xét của phòng KT-CL">
                    <span>
                        <IconButton size="small" color="error" onClick={() => onAction('comment', point)} sx={{ bgcolor: 'error.lighter' }}>
                            <IconChecklist size={18} />
                        </IconButton>
                    </span>
                </Tooltip>
            </PermissionGuard>
        </Stack>
    );
};
