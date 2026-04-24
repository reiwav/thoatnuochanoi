import React, { useState, useMemo } from 'react';
import { Box, Typography, Chip, Stack, IconButton, Collapse, Paper, Grid, TableRow, TableCell, Button } from '@mui/material';
import { IconChevronUp, IconChevronDown, IconInfoCircle } from '@tabler/icons-react';
import { getLatestData } from 'utils/inundationUtils';
import { formatDateTime, formatDuration } from 'utils/dataHelper';
import useInundationStore from 'store/useInundationStore';
import { SurveyInfoSection, MechInfoSection, ReviewCommentSection } from '../../../employee/inundation/components/TechnicalSections';

const InundationHistoryCard = ({ report, navigate, basePath, handleOpenViewer }) => {
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
                        <Typography variant="body2" sx={{ mt: 1 }}>Chiều sâu: <b>{latest?.depth || 0}mm</b></Typography>
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

    return (
        <>
            {/* Mobile View: Visible on xs/sm */}
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                <Paper elevation={0} sx={{ p: 2, mb: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.dark', mb: 1 }}>{report.street_name}</Typography>
                            <Stack direction="row" spacing={1}>
                                <Chip label={report.status === 'active' ? 'Đang ngập' : 'Đã kết thúc'} color={report.status === 'active' ? 'error' : 'success'} size="small" sx={{ fontWeight: 800 }} />
                                {report.needs_correction && <Chip label="CẦN SỬA" size="small" color="error" sx={{ fontWeight: 800 }} />}
                            </Stack>
                        </Box>
                        <IconButton size="small" onClick={() => setOpen(!open)}>{open ? <IconChevronUp size={22} /> : <IconChevronDown size={22} />}</IconButton>
                    </Box>
                    <Collapse in={open} timeout="auto" unmountOnExit>{renderDetails()}</Collapse>
                </Paper>
            </Box>

            {/* Desktop View: Visible on md and up */}
            <TableRow hover sx={{ display: { xs: 'none', md: 'table-row' } }}>
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
                    <Chip 
                        label={report.status === 'active' ? (latest?.flood_level_name || 'Đang ngập') : 'Đã kết thúc'} 
                        sx={{ 
                            fontWeight: 700,
                            bgcolor: report.status === 'active' ? (latest?.flood_level_color ? `${latest.flood_level_color}20` : 'error.lighter') : 'success.lighter',
                            color: report.status === 'active' ? (latest?.flood_level_color || 'error.main') : 'success.main',
                            border: '1px solid',
                            borderColor: report.status === 'active' ? (latest?.flood_level_color ? `${latest.flood_level_color}40` : 'error.light') : 'success.light'
                        }} 
                        size="small" 
                    />
                </TableCell>
                <TableCell align="right">
                    <Button size="small" onClick={() => navigate(`${basePath}/inundation/form?id=${report.id}&tab=1&readonly=true`)}>Chi tiết</Button>
                </TableCell>
            </TableRow>
            <TableRow sx={{ display: { xs: 'none', md: open ? 'table-row' : 'none' } }}>
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
        </>
    );
};

export default InundationHistoryCard;
