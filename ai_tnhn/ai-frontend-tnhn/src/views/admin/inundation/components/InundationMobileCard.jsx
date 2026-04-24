import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, Divider, Button, Collapse, Stack } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { getInundationImageUrl } from 'utils/imageHelper';
import { ReportInfoSection } from '../../../employee/inundation/components/TechnicalSections';
import InundationStatusChip from './InundationStatusChip';
import ActionButtons from './ActionButtons';

const InundationMobileCard = ({ point, onAction, onOpenViewer, onOpenDetail, navigate, basePath }) => {
    const theme = useTheme();
    const [expanded, setExpanded] = useState(false);
    const isFlooded = !!point.report_id;
    const report = point.active_report;
    const lastReport = point.last_report;

    return (
        <Paper sx={{ p: 2, mb: 1.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', position: 'relative' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Box>
                    <Typography 
                        variant="h5" 
                        onClick={() => onOpenDetail(point)}
                        sx={{ fontWeight: 800, color: 'primary.dark', cursor: 'pointer' }}
                    >
                        {point.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">{point.address}</Typography>
                </Box>
                <InundationStatusChip isFlooding={isFlooded} floodLevelName={report?.flood_level_name} />
            </Box>

            <Grid container spacing={2} sx={{ mb: 1.5 }}>
                <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" display="block">KÍCH THƯỚC</Typography>
                    {isFlooded ? (
                        <Typography variant="body2" sx={{ fontWeight: 800, color: 'error.main' }}>
                            {report?.length} x {report?.width} x {report?.depth}
                        </Typography>
                    ) : (
                        <Typography variant="body2" color="text.disabled">-</Typography>
                    )}
                </Grid>
                <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" display="block">CẬP NHẬT</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {isFlooded ? dayjs(report?.updated_at).fromNow() : (lastReport?.end_time ? dayjs(lastReport.end_time * 1000).format('DD/MM HH:mm') : '-')}
                    </Typography>
                </Grid>
            </Grid>

            <Divider sx={{ mb: 1.5, borderStyle: 'dashed' }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button 
                    size="small" 
                    variant="text" 
                    onClick={() => setExpanded(!expanded)}
                    endIcon={expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                    sx={{ fontWeight: 700, p: 0 }}
                >
                    {expanded ? 'Thu gọn' : 'Chi tiết'}
                </Button>
                <ActionButtons point={point} onAction={onAction} navigate={navigate} basePath={basePath} />
            </Box>

            <Collapse in={expanded} timeout="auto" unmountOnExit>
                <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
                    {(isFlooded ? report : lastReport) ? (
                        <Stack spacing={1.5}>
                            {report?.images?.length > 0 && (
                                <Stack direction="row" spacing={0.5} sx={{ overflowX: 'auto', py: 0.5 }}>
                                    {report.images.map((img, i) => (
                                        <Box key={i} onClick={() => onOpenViewer(report.images, i)} sx={{ width: 40, height: 40, borderRadius: 1, overflow: 'hidden', cursor: 'pointer' }}>
                                            <img src={getInundationImageUrl(img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </Box>
                                    ))}
                                </Stack>
                            )}
                            <ReportInfoSection latest={isFlooded ? report : lastReport} handleOpenViewer={onOpenViewer} />
                        </Stack>
                    ) : (
                        <Typography variant="caption" color="text.disabled">Không có dữ liệu chi tiết</Typography>
                    )}
                </Box>
            </Collapse>
        </Paper>
    );
};

export default InundationMobileCard;
