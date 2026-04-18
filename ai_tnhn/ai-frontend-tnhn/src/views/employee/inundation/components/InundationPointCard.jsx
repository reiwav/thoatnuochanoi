import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Stack, Chip, Paper, IconButton, Collapse, Button, Divider, Grid, Tooltip, alpha
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    IconChevronDown, IconChevronUp, IconSend, IconEngine, IconChecklist,
    IconMapPin, IconInfoCircle, IconCheck, IconX, IconAlertTriangle
} from '@tabler/icons-react';

import PermissionGuard from 'ui-component/PermissionGuard';
import InundationStatus from './InundationStatus';
import { SurveyInfoSection, MechInfoSection, ReviewCommentSection } from './TechnicalSections';
import { getLatestData } from 'utils/inundationUtils';
import { formatDuration } from 'utils/dataHelper';

const InundationPointCard = ({ point, openTask, handleOpenViewer }) => {
    const theme = useTheme();
    const [expanded, setExpanded] = useState(false);

    const latest = useMemo(() => {
        if (!point.report_id && !point.last_report) return null;
        return getLatestData(point.active_report || point.last_report || point);
    }, [point]);

    const isHighPriority = !!point.report_id;

    return (
        <Paper
            elevation={isHighPriority ? 4 : 1}
            sx={{
                borderRadius: 4,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: isHighPriority ? 'error.light' : 'divider',
                background: isHighPriority
                    ? `linear-gradient(135deg, ${alpha(theme.palette.error.light, 0.05)} 0%, ${theme.palette.background.paper} 100%)`
                    : theme.palette.background.paper,
                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[8],
                    borderColor: isHighPriority ? 'error.main' : 'primary.light'
                }
            }}
        >
            <Box sx={{ p: 2.5 }}>
                {/* Header: Title and Status */}
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: isHighPriority ? 'error.dark' : 'text.primary', mb: 0.5 }}>
                            {point.name}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <IconMapPin size={14} color={theme.palette.text.secondary} />
                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                                {point.address}
                            </Typography>
                        </Stack>
                    </Box>
                    <Box sx={{ textAlign: 'right', flexShrink: 0, ml: 1 }}>
                        <InundationStatus
                            reportId={point.report_id}
                            latest={latest}
                            needsCorrection={latest?.needs_correction}
                        />
                    </Box>
                </Stack>

                {/* Operating Indicators (Quick Summary) */}
                {isHighPriority && (
                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                        <Tooltip title="Trạng thái Khảo sát">
                            <Box sx={{
                                px: 1, py: 0.5, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 0.5,
                                bgcolor: latest?.survey_checked ? 'success.lighter' : 'grey.100',
                                border: '1px solid', borderColor: latest?.survey_checked ? 'success.light' : 'divider'
                            }}>
                                {latest?.survey_checked ? <IconCheck size={14} color={theme.palette.success.main} /> : <IconX size={14} color={theme.palette.text.disabled} />}
                                <Typography variant="caption" sx={{ fontWeight: 800, color: latest?.survey_checked ? 'success.dark' : 'text.disabled' }}>XNTK</Typography>
                            </Box>
                        </Tooltip>
                        <Tooltip title="Trạng thái Cơ giới">
                            <Box sx={{
                                px: 1, py: 0.5, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 0.5,
                                bgcolor: latest?.mech_checked ? 'secondary.lighter' : 'grey.100',
                                border: '1px solid', borderColor: latest?.mech_checked ? 'secondary.light' : 'divider'
                            }}>
                                {latest?.mech_checked ? <IconCheck size={14} color={theme.palette.secondary.main} /> : <IconX size={14} color={theme.palette.text.disabled} />}
                                <Typography variant="caption" sx={{ fontWeight: 800, color: latest?.mech_checked ? 'secondary.dark' : 'text.disabled' }}>Cơ giới</Typography>
                            </Box>
                        </Tooltip>
                        {latest?.needs_correction && (
                            <Tooltip title="Chờ rà soát lại">
                                <Box sx={{ px: 1, py: 0.5, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'warning.lighter', border: '1px solid', borderColor: 'warning.light' }}>
                                    <IconAlertTriangle size={14} color={theme.palette.warning.main} />
                                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'warning.dark' }}>Cần sửa</Typography>
                                </Box>
                            </Tooltip>
                        )}
                    </Stack>
                )}

                {/* Main Actions Bar */}
                <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                    <Button
                        size="small"
                        color="inherit"
                        startIcon={expanded ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
                        onClick={() => setExpanded(!expanded)}
                        sx={{
                            fontWeight: 800,
                            borderRadius: 2,
                            textTransform: 'none',
                            color: 'text.secondary',
                            '&:hover': { bgcolor: 'grey.100' }
                        }}
                    >
                        Chi tiết
                    </Button>

                    <Stack direction="row" spacing={1}>
                        <PermissionGuard permission="inundation:survey">
                            <Tooltip title="Báo cáo XNTK">
                                <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => openTask('SURVEY', point)}
                                    sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) } }}
                                >
                                    <IconSend size={20} />
                                </IconButton>
                            </Tooltip>
                        </PermissionGuard>
                        <PermissionGuard permission="inundation:mechanic">
                            <Tooltip title="Báo cáo Cơ giới">
                                <IconButton
                                    size="small"
                                    color="secondary"
                                    onClick={() => openTask('MECH', point)}
                                    sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1), '&:hover': { bgcolor: alpha(theme.palette.secondary.main, 0.2) } }}
                                >
                                    <IconEngine size={20} />
                                </IconButton>
                            </Tooltip>
                        </PermissionGuard>
                        <PermissionGuard permission="inundation:review">
                            <Tooltip title="Rà soát nội dung">
                                <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => openTask('REVIEW', point)}
                                    sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.2) } }}
                                >
                                    <IconChecklist size={20} />
                                </IconButton>
                            </Tooltip>
                        </PermissionGuard>
                    </Stack>
                </Stack>

                {/* Expandable Details Section */}
                <Collapse in={expanded} timeout="auto" unmountOnExit>
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
                        {latest ? (
                            <Stack spacing={2}>
                                {isHighPriority && (
                                    <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                                            <IconInfoCircle size={14} /> THÔNG TIN NGẬP:
                                        </Typography>
                                        <Grid container spacing={1}>
                                            <Grid item xs={6}>
                                                <Typography variant="caption" color="textSecondary">Độ sâu:</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 800 }}>{latest.depth || 0} mm</Typography>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Typography variant="caption" color="textSecondary">Thời gian ngập:</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 800 }}>{formatDuration(point.active_report?.start_time)}</Typography>
                                            </Grid>
                                        </Grid>
                                    </Box>
                                )}

                                <SurveyInfoSection latest={latest} handleOpenViewer={handleOpenViewer} />
                                <MechInfoSection latest={latest} handleOpenViewer={handleOpenViewer} />
                                <ReviewCommentSection latest={latest} />
                            </Stack>
                        ) : (
                            <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2, fontStyle: 'italic' }}>
                                Chưa có dữ liệu vận hành gần nhất
                            </Typography>
                        )}
                    </Box>
                </Collapse>
            </Box>
        </Paper>
    );
};

export default InundationPointCard;
