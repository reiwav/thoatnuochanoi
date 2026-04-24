import { useState } from 'react';
import {
    Card, CardContent, Typography, Stack, Chip, Box, Badge, IconButton,
    Divider, Tooltip, useTheme, Grid, Collapse, Button, alpha
} from '@mui/material';
import {
    IconAlertTriangle, IconPhoto, IconClock, IconUser,
    IconMapPin, IconBuildingCommunity, IconRuler2,
    IconChevronDown, IconChevronUp, IconSend, IconClipboardCheck, IconEngine, IconChecklist, IconCircleCheck
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import AdminInundationActionMenu from './AdminInundationActionMenu';
import { SurveyInfoSection, MechInfoSection, ReviewCommentSection, ReportInfoSection } from '../../../employee/inundation/components/TechnicalSections';
import PermissionGuard from 'ui-component/PermissionGuard';
import { getInundationImageUrl } from 'utils/imageHelper';

const AdminInundationCard = ({ point, onAction, onOpenViewer, onOpenDetail, navigate, basePath }) => {
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
                width: { xs: '400px', sm: '300px' },
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
                            onViewHistory={(p) => navigate(`${basePath}/station/inundation/history?id=${p.id}`)}
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
                                <Grid item xs={2.5}>
                                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase' }}>Dài</Typography>
                                    <Typography variant="h5" sx={{ fontWeight: 800 }}>{report?.length || '0'}<span style={{ fontSize: '0.6rem', color: '#999', marginLeft: 1 }}>m</span></Typography>
                                </Grid>
                                <Grid item xs={2.5}>
                                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase' }}>Rộng</Typography>
                                    <Typography variant="h5" sx={{ fontWeight: 800 }}>{report?.width || '0'}<span style={{ fontSize: '0.6rem', color: '#999', marginLeft: 1 }}>m</span></Typography>
                                </Grid>
                                <Grid item xs={3} sx={{ borderLeft: '1px solid', borderColor: `${displayColor}20`, pl: 1 }}>
                                    <Typography variant="caption" sx={{ display: 'block', color: displayColor, fontWeight: 800, fontSize: '0.6rem', textTransform: 'uppercase' }}>Sâu</Typography>
                                    <Typography variant="h3" sx={{ fontWeight: 900, color: displayColor, lineHeight: 1 }}>{report?.depth || '0'}<span style={{ fontSize: '0.6rem', opacity: 0.7, marginLeft: 2 }}>cm</span></Typography>
                                </Grid>
                                <Grid item xs={4} sx={{ textAlign: 'right' }}>
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
                                        {report?.updated_at && dayjs(report.updated_at).year() > 2000 ? dayjs(report.updated_at).fromNow() : 'Vừa xong'}
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
                            <PermissionGuard permission="inundation:review">
                                <Tooltip title="Kết thúc nhanh">
                                    <IconButton
                                        size="small" color="success"
                                        disabled={!isFlooded}
                                        onClick={() => onAction('quick_finish', point)}
                                        sx={{ bgcolor: 'success.lighter', '&:hover': { bgcolor: 'success.light' } }}
                                    >
                                        <IconCircleCheck size={18} />
                                    </IconButton>
                                </Tooltip>
                            </PermissionGuard>
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
