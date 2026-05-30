import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
    Typography,
    Box,
    useTheme,
    useMediaQuery,
    CircularProgress
} from '@mui/material';
import { IconX } from '@tabler/icons-react';
import inundationApi from 'api/inundation';

// Form imports
import { ReviewActionForm } from '../inundation/components/ActionForms';
import PumpingStationReport from './PumpingStationReportForm';
import InundationReportPanel from '../inundation/InundationReportPanel';
import WastewaterTreatmentReport from '../../admin/wastewater-treatment/WastewaterTreatmentReport';

const EmployeeActionDialog = ({ open, onClose, mode, data, onFinished }) => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const [fetchedReport, setFetchedReport] = useState(null);
    const [loadingReport, setLoadingReport] = useState(false);

    useEffect(() => {
        if (open && data && data.report_id) {
            setLoadingReport(true);
            inundationApi.getReport(data.report_id)
                .then(res => {
                    setFetchedReport(res);
                })
                .catch(err => {
                    console.error("Error fetching fresh report for employee action dialog:", err);
                })
                .finally(() => {
                    setLoadingReport(false);
                });
        } else {
            setFetchedReport(null);
        }
    }, [open, data]);

    const getTitle = () => {
        switch (mode) {
            case 'REPORT':
                return `Nhập Báo cáo của P.KT-CL: ${data?.name}`;
            case 'REPORT_ENTERPRISE':
                return `Nhập báo cáo Địa bàn: ${data?.name}`;
            case 'SURVEY':
                return `XN.KSTK báo cáo: ${data?.name}`;
            case 'MECH':
                return `Xí Nghiệp cơ giới: ${data?.name}`;
            case 'REVIEW':
                return `Nhận xét: ${data?.name}`;
            case 'PUMPING':
                return `Nhập báo cáo Trạm bơm: ${data?.name}`;
            case 'WASTEWATER':
                return `Nhập báo cáo Trạm XLNT: ${data?.name}`;
            default:
                return 'Nhập Báo cáo của P.KT-CL';
        }
    };

    const renderForm = () => {
        if (!data) return null;

        if (loadingReport) {
            return (
                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', py: 5, gap: 1.5 }}>
                    <CircularProgress size={32} color="secondary" />
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                        Đang tải dữ liệu mới nhất...
                    </Typography>
                </Box>
            );
        }

        const reportToUse = fetchedReport || (data.report_id ? data.last_report : null);

        switch (mode) {
            case 'REPORT':
                return (
                    <InundationReportPanel
                        selectedReport={reportToUse}
                        pointId={data.id}
                        initialStreetName={data.name}
                        onSuccess={onFinished}
                        isCorrectionMode={false}
                        permission="inundation:report"
                        apiMode="ktcl"
                    />
                );
            case 'REPORT_ENTERPRISE':
                return (
                    <InundationReportPanel
                        selectedReport={reportToUse}
                        pointId={data.id}
                        initialStreetName={data.name}
                        onSuccess={onFinished}
                        isCorrectionMode={reportToUse?.needs_correction}
                        permission="inundation:enterprise_report"
                    />
                );
            case 'SURVEY':
                return (
                    <InundationReportPanel
                        selectedReport={reportToUse}
                        pointId={data.id}
                        initialStreetName={data.name}
                        onSuccess={onFinished}
                        isCorrectionMode={false}
                        permission="inundation:survey"
                        apiMode="survey"
                    />
                );
            case 'MECH':
                return (
                    <InundationReportPanel
                        selectedReport={reportToUse}
                        pointId={data.id}
                        initialStreetName={data.name}
                        onSuccess={onFinished}
                        isCorrectionMode={false}
                        permission="inundation:mechanic"
                        apiMode="mech"
                    />
                );
            case 'REVIEW':
                const freshPointForReview = {
                    ...data,
                    last_report: reportToUse
                };
                return <ReviewActionForm point={freshPointForReview} onFinished={onFinished} onClose={onClose} />;
            case 'PUMPING':
                return <PumpingStationReport station={data} onSuccess={onFinished} onClose={onClose} />;
            case 'WASTEWATER':
                return <WastewaterTreatmentReport station={data} onSuccess={onFinished} onClose={onClose} />;
            default:
                return null;
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullScreen={fullScreen}
            maxWidth="sm"
            fullWidth
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: fullScreen ? 0 : 3,
                        backgroundImage: 'none'
                    }
                }
            }}
        >
            <DialogTitle component="div" sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'grey.50' }}>
                <Typography component="div" variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>
                    {getTitle()}
                </Typography>
                <IconButton onClick={onClose} size="small">
                    <IconX size={20} />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 2 }}>
                <Box sx={{ mt: 1 }}>
                    {renderForm()}
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default EmployeeActionDialog;
