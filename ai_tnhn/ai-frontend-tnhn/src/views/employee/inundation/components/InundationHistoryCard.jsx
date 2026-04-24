import React, { useState, useMemo } from 'react';
import { Box, Typography, Chip, Stack, IconButton, Collapse, Paper, Grid, TableRow, TableCell, Button, Divider, alpha } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconChevronUp, IconChevronDown, IconInfoCircle, IconMapPin, IconClock } from '@tabler/icons-react';
import { getLatestData } from 'utils/inundationUtils';
import { formatDateTime, formatDuration } from 'utils/dataHelper';
import useInundationStore from 'store/useInundationStore';
import { SurveyInfoSection, MechInfoSection, ReviewCommentSection } from './TechnicalSections';

const InundationHistoryCard = ({ report, isMobile, navigate, basePath, handleOpenViewer }) => {
    const theme = useTheme();
    const [open, setOpen] = useState(false);
    const organizations = useInundationStore(state => state.organizations);
    const latest = useMemo(() => getLatestData(report), [report]);

    const orgName = useMemo(() => {
        return (Array.isArray(organizations) ? organizations.find(o => o.id === report.org_id)?.name : '') || report.org_id;
    }, [organizations, report.org_id]);

    const renderDetails = () => (
        <Stack spacing={2} sx={{ mt: 2, pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
            <Box>
                <Typography variant="body2" color="text.secondary">Đơn vị quản lý: <b>{orgName}</b></Typography>
            </Box>
            <Grid container spacing={2}>
                <Grid item xs={12} md={4}><SurveyInfoSection latest={latest} handleOpenViewer={handleOpenViewer} /></Grid>
                <Grid item xs={12} md={4}><MechInfoSection latest={latest} handleOpenViewer={handleOpenViewer} /></Grid>
                <Grid item xs={12} md={4}>
                    <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 1 }}>ℹ️ TỔNG QUAN</Typography>
                        <ReviewCommentSection latest={latest} />
                        <Typography variant="body2" sx={{ mt: 1 }}>Chiều sâu: <b>{latest?.depth || 0}</b></Typography>
                        {(latest?.length || latest?.width) && (
                            <Typography variant="body2">Kích thước: <b>{latest.length || '?'} x {latest.width || '?'}</b></Typography>
                        )}
                        <Typography variant="body2">Thời gian: <b>{formatDuration(report.start_time, report.end_time)}</b></Typography>
                    </Box>
                </Grid>
            </Grid>
            <Button
                fullWidth variant="outlined" size="large"
                onClick={() => navigate(`${basePath}/inundation/form?id=${report.id}&tab=1&readonly=true`)}
                sx={{ borderRadius: 2, fontWeight: 800 }}
            >
                Xem chi tiết lịch sử
            </Button>
        </Stack>
    );

    if (isMobile) {
        return (
            <Paper
                elevation={0}
                sx={{
                    p: 2.5,
                    mb: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 4,
                    bgcolor: 'background.paper',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        borderColor: 'primary.light',
                        boxShadow: theme.shadows[4]
                    }
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box sx={{ pr: 2 }}>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: 'text.primary', mb: 0.5 }}>{report.street_name}</Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                            <IconMapPin size={12} /> {report.address || 'Hà Nội'}
                        </Typography>

                        <Stack direction="row" spacing={1} alignItems="center">
                            <Chip
                                label={report.status === 'active' ? 'Đang ngập' : 'Đã kết thúc'}
                                size="small"
                                sx={{
                                    height: 22,
                                    fontSize: '0.65rem',
                                    fontWeight: 900,
                                    bgcolor: report.status === 'active' ? alpha(theme.palette.error.main, 0.1) : alpha(theme.palette.success.main, 0.1),
                                    color: report.status === 'active' ? 'error.main' : 'success.main',
                                    borderRadius: 1.5,
                                    textTransform: 'uppercase'
                                }}
                            />
                            {report.needs_correction && (
                                <Chip
                                    label="CẦN SỬA"
                                    size="small"
                                    color="error"
                                    sx={{ height: 22, fontSize: '0.65rem', fontWeight: 900, borderRadius: 1.5 }}
                                />
                            )}
                        </Stack>
                    </Box>
                    <IconButton
                        size="small"
                        onClick={() => setOpen(!open)}
                        sx={{ bgcolor: 'grey.50' }}
                    >
                        {open ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                    </IconButton>
                </Box>

                <Stack direction="row" spacing={2} sx={{ mb: open ? 0 : 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <IconClock size={14} color={theme.palette.text.secondary} />
                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                            {formatDateTime(report.start_time)}
                        </Typography>
                    </Box>
                </Stack>

                <Collapse in={open} timeout="auto" unmountOnExit>{renderDetails()}</Collapse>
            </Paper>
        );
    }

    return (
        <React.Fragment>
            <TableRow hover>
                <TableCell sx={{ width: 40, p: 2 }}>
                    <IconButton size="small" onClick={() => setOpen(!open)}>{open ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}</IconButton>
                </TableCell>
                <TableCell sx={{ p: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 800, cursor: 'pointer', color: 'primary.dark' }} onClick={() => setOpen(!open)}>{report.street_name}</Typography>
                </TableCell>
                <TableCell><Typography variant="body2" color="primary">{orgName}</Typography></TableCell>
                <TableCell><Typography variant="body2">{formatDateTime(report.start_time)}</Typography></TableCell>
                <TableCell><Typography variant="body2">{report.status === 'active' ? 'Đang ngập' : formatDateTime(report.end_time)}</Typography></TableCell>
                <TableCell>
                    <Chip label={report.status === 'active' ? 'Đang ngập' : 'Đã kết thúc'} color={report.status === 'active' ? 'error' : 'success'} size="small" sx={{ fontWeight: 700 }} />
                </TableCell>
                <TableCell align="right">
                    <Button size="small" onClick={() => navigate(`${basePath}/inundation/form?id=${report.id}&tab=1&readonly=true`)}>Chi tiết</Button>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell sx={{ p: 0 }} colSpan={7}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ m: 2, p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <IconInfoCircle size={18} /> Chi tiết báo cáo lịch sử
                            </Typography>
                            {renderDetails()}
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
};

export default InundationHistoryCard;
