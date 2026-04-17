import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Stack, Chip, IconButton, Collapse, Paper, Grid,
    TableRow, TableCell, Menu, MenuItem, ListItemIcon, ListItemText,
    Tabs, Tab, Button
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    IconChevronUp, IconChevronDown, IconDotsVertical, IconEye,
    IconEdit, IconCheck, IconPlus, IconInfoCircle
} from '@tabler/icons-react';
import { getLatestData } from 'utils/inundationUtils';
import { formatDateTime, formatDuration } from 'utils/dataHelper';
import useAuthStore from 'store/useAuthStore';
import useInundationStore from 'store/useInundationStore';
import InundationStatus from './InundationStatus';
import { SurveyInfoSection, MechInfoSection, ReviewCommentSection } from './TechnicalSections';
import { SurveyActionForm, MechActionForm, ReviewActionForm } from './ActionForms';

const InundationPointCard = ({ point, isMobile, navigate, basePath, handleOpenViewer }) => {
    const theme = useTheme();
    const { user, hasPermission, isEmployee } = useAuthStore();
    const { organizations, resolveReport, fetchPoints } = useInundationStore();
    
    const [open, setOpen] = useState(!!point.report_id);
    const [tabValue, setTabValue] = useState('');
    const [anchorEl, setAnchorEl] = useState(null);
    const menuOpen = Boolean(anchorEl);

    const latest = useMemo(() => getLatestData(point.active_report || point.last_report), [point]);

    const canSurvey = useMemo(() => hasPermission('inundation:survey'), [hasPermission]);
    const canMech = useMemo(() => hasPermission('inundation:mechanic') || hasPermission('inundation:mech'), [hasPermission]);
    const canReview = useMemo(() => {
        if (isEmployee) return false;
        if (!hasPermission('inundation:review')) return false;
        if (user?.isCompany || user?.role === 'super_admin') return true;
        const report = point.active_report || point.last_report;
        if (!report) return false;
        if (report.org_id === user?.org_id) return true;
        const userOrg = Array.isArray(organizations) ? organizations.find(o => o.id === user?.org_id) : null;
        return userOrg?.inundation_ids?.includes(report.point_id);
    }, [user, point, organizations, isEmployee, hasPermission]);

    const isMechOnly = useMemo(() => hasPermission('inundation:mechanic') && !hasPermission('inundation:edit'), [hasPermission]);
    const isSurveyOnly = useMemo(() => hasPermission('inundation:survey') && !hasPermission('inundation:edit'), [hasPermission]);
    const canViewTabs = canSurvey || canMech || canReview;

    const needsCorrection = useMemo(() => {
        const report = point.active_report || point.last_report;
        return report?.needs_correction || report?.updates?.some(u => u.needs_correction);
    }, [point]);
    const needsCorrectionUpdateId = useMemo(() => {
        const report = point.active_report || point.last_report;
        return report?.needs_correction_update_id || '';
    }, [point]);
    const isReviewUpdated = useMemo(() => (point.active_report || point.last_report)?.is_review_updated, [point]);

    React.useEffect(() => {
        if (!tabValue && canViewTabs && point.report_id) {
            if (canMech && isEmployee) setTabValue('mech');
            else if (canReview) setTabValue('review');
            else if (canSurvey) setTabValue('survey');
            else if (canMech) setTabValue('mech');
        }
    }, [canViewTabs, canMech, canReview, canSurvey, isEmployee, tabValue, point.report_id]);

    const handleMenuClick = (event) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
    };
    const handleMenuClose = () => setAnchorEl(null);

    const handleResolve = async () => {
        handleMenuClose();
        if (window.confirm('Xác nhận kết thúc ngập cho điểm này?')) {
            await resolveReport(point.report_id);
            fetchPoints();
        }
    };

    const renderActionButtons = () => {
        if (point.report_id) {
            if (hasPermission('inundation:edit') || (isEmployee && needsCorrection)) {
                return (
                    <Button
                        fullWidth variant="contained" color="error" size="large"
                        onClick={() => {
                            let url = `${basePath}/inundation/form?tab=1&id=${point.report_id}&name=${encodeURIComponent(point.name)}`;
                            if (needsCorrection && needsCorrectionUpdateId) url += `&edit_update_id=${needsCorrectionUpdateId}`;
                            navigate(url);
                        }}
                        sx={{ borderRadius: 2, fontWeight: 800, py: 1.5, animation: needsCorrection ? 'pulse-red 2s infinite' : 'none' }}
                    >
                        {needsCorrection ? 'Chỉnh sửa theo yêu cầu' : 'Cập nhật tình hình'}
                    </Button>
                );
            }
        } else if (hasPermission('inundation:create')) {
            return (
                <Button
                    fullWidth variant="contained" color="primary" size="large"
                    onClick={() => navigate(`${basePath}/inundation/form?tab=0&point_id=${point.id}&name=${encodeURIComponent(point.name)}`)}
                    sx={{ borderRadius: 2, fontWeight: 800, py: 1.5 }}
                >
                    Báo cáo điểm ngập
                </Button>
            );
        }
        return null;
    };

    if (isMobile) {
        return (
            <Paper
                elevation={0}
                sx={{
                    p: 2, mb: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper',
                    cursor: 'pointer', '&:hover': { borderColor: 'primary.main', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }
                }}
                onClick={() => {
                    if (canMech && isEmployee) {
                        const tab = canMech ? 'mech' : 'survey';
                        const idPart = point.report_id ? `&id=${point.report_id}` : '';
                        navigate(`${basePath}/inundation/form?tab=${tab}${idPart}&point_id=${point.id}&name=${encodeURIComponent(point.name)}`);
                    } else {
                        setOpen(!open);
                    }
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1, gap: 1 }}>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.dark', mb: 1, lineHeight: 1.2 }}>{point.name}</Typography>
                        <InundationStatus reportId={point.report_id} latest={latest} isReviewUpdated={isReviewUpdated} needsCorrection={needsCorrection} />
                    </Box>
                    {point.report_id && !(canMech && isEmployee) && !(canSurvey && isEmployee) && (
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setOpen(!open); }} sx={{ mt: -0.5 }}>
                            {open ? <IconChevronUp size={22} /> : <IconChevronDown size={22} />}
                        </IconButton>
                    )}
                </Box>

                <Collapse in={open} timeout="auto" unmountOnExit onClick={(e) => e.stopPropagation()}>
                    <Stack spacing={2} sx={{ mt: 2, pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
                        {!isMechOnly && !isSurveyOnly && <Typography variant="body1" sx={{ fontWeight: 700, color: 'primary.main' }}>{point.address}</Typography>}
                        
                        <SurveyInfoSection latest={latest} handleOpenViewer={handleOpenViewer} />
                        <MechInfoSection latest={latest} handleOpenViewer={handleOpenViewer} />

                        {!isMechOnly && !isSurveyOnly && (
                            <>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">Đơn vị quản lý: <b>{point.org_name || (Array.isArray(organizations) ? organizations.find(o => o.id === point.org_id)?.name : '') || ''}</b></Typography>
                                </Box>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="body2" color="text.secondary">Kích thước: <b>{latest ? `${latest.length || 0}m x ${latest.width || 0}m x ${latest.depth || 0}m` : '-'}</b></Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="body2" color="text.secondary">
                                            {point.report_id ? `Bắt đầu: ${formatDateTime(latest?.start_time)} (Đã ngập ${formatDuration(latest.start_time)})` : 'Đã kết thúc'}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </>
                        )}

                        {point.report_id && canViewTabs && (
                            <Box sx={{ mt: 1 }}>
                                <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 1 }}>
                                    {canReview && <Tab value="review" label="NHẬN XÉT" />}
                                    {canSurvey && <Tab value="survey" label="XNTK" />}
                                    {canMech && <Tab value="mech" label="CƠ GIỚI" />}
                                </Tabs>
                                {tabValue === 'survey' && <SurveyActionForm point={point} />}
                                {tabValue === 'mech' && <MechActionForm point={point} />}
                                {tabValue === 'review' && <ReviewActionForm point={point} />}
                            </Box>
                        )}
                        {renderActionButtons()}
                    </Stack>
                </Collapse>
            </Paper>
        );
    }

    return (
        <React.Fragment>
            <TableRow hover sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid', borderColor: 'divider' } }}>
                <TableCell sx={{ width: 40, p: 2 }}>
                    <IconButton size="small" onClick={() => setOpen(!open)}>{open ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}</IconButton>
                </TableCell>
                <TableCell sx={{ p: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 800, cursor: 'pointer', color: 'primary.dark' }} onClick={() => setOpen(!open)}>{point.name}</Typography>
                </TableCell>
                <TableCell><Typography variant="body2" color="primary">{point.org_name || (Array.isArray(organizations) ? organizations.find(o => o.id === point.org_id)?.name : '') || ''}</Typography></TableCell>
                <TableCell align="center">
                    <Chip label={point.report_id ? 'Đang ngập' : 'Bình thường'} color={point.report_id ? 'error' : 'success'} size="small" sx={{ fontWeight: 700 }} />
                </TableCell>
                <TableCell>
                    <InundationStatus reportId={point.report_id} latest={latest} isReviewUpdated={isReviewUpdated} needsCorrection={needsCorrection} />
                </TableCell>
                <TableCell align="center" sx={{ p: 2, width: 120 }}>
                    {point.report_id ? (
                        <>
                            <IconButton size="small" onClick={handleMenuClick}><IconDotsVertical size={20} /></IconButton>
                            <Menu anchorEl={anchorEl} open={menuOpen} onClose={handleMenuClose}>
                                <MenuItem onClick={() => { handleMenuClose(); navigate(`${basePath}/inundation/form?id=${point.report_id}&tab=1&readonly=true`); }}><ListItemIcon><IconEye size={18} /></ListItemIcon><ListItemText primary="Xem chi tiết" /></MenuItem>
                                {hasPermission('inundation:edit') && (
                                    <MenuItem onClick={() => { handleMenuClose(); navigate(`${basePath}/inundation/form?tab=1&id=${point.report_id}&name=${encodeURIComponent(point.name)}${needsCorrection ? `&edit_update_id=${needsCorrectionUpdateId}` : ''}`); }}>
                                        <ListItemIcon><IconEdit size={18} /></ListItemIcon><ListItemText primary={needsCorrection ? "Sửa lỗi" : "Cập nhật"} />
                                    </MenuItem>
                                )}
                                {hasPermission('inundation:edit') && !isEmployee && (
                                    <MenuItem sx={{ color: 'success.main' }} onClick={handleResolve}><ListItemIcon><IconCheck size={18} color="green" /></ListItemIcon><ListItemText primary="Kết thúc ngập" /></MenuItem>
                                )}
                            </Menu>
                        </>
                    ) : (
                        <IconButton size="small" color="primary" onClick={() => navigate(`${basePath}/inundation/form?tab=0&point_id=${point.id}&name=${encodeURIComponent(point.name)}`)}><IconPlus size={20} /></IconButton>
                    )}
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell sx={{ p: 0 }} colSpan={6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ m: 2, p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                <IconInfoCircle size={18} /> {point.address}
                            </Typography>
                            <Grid container spacing={2} sx={{ mb: 2 }}>
                                <Grid item xs={12} md={4}>
                                    <Box sx={{ p: 1.5, height: '100%', bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
                                        <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 1 }}>ℹ️ TỔNG QUAN</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{latest ? `${latest.length || 0}m x ${latest.width || 0}m x ${latest.depth || 0}m` : '-'}</Typography>
                                        <ReviewCommentSection latest={latest} />
                                    </Box>
                                </Grid>
                                <Grid item xs={12} md={4}><MechInfoSection latest={latest} handleOpenViewer={handleOpenViewer} /></Grid>
                                <Grid item xs={12} md={4}><SurveyInfoSection latest={latest} handleOpenViewer={handleOpenViewer} /></Grid>
                            </Grid>
                            {point.report_id && canViewTabs && (
                                <Box>
                                    <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} variant="fullWidth" sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                                        {canReview && <Tab value="review" label="Rà soát của PKTCL" />}
                                        {canSurvey && <Tab value="survey" label="XNTK" />}
                                        {canMech && <Tab value="mech" label="XN Cơ giới" />}
                                    </Tabs>
                                    {tabValue === 'survey' && <SurveyActionForm point={point} />}
                                    {tabValue === 'mech' && <MechActionForm point={point} />}
                                    {tabValue === 'review' && <ReviewActionForm point={point} />}
                                </Box>
                            )}
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
};

export default InundationPointCard;
