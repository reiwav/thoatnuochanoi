import React from 'react';
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
    useMediaQuery
} from '@mui/material';
import { IconX } from '@tabler/icons-react';

// Form imports
import { SurveyActionForm, MechActionForm, ReviewActionForm } from '../inundation/components/ActionForms';
import PumpingStationReport from './PumpingStationReportForm';
import InundationReportPanel from '../inundation/InundationReportPanel';

const EmployeeActionDialog = ({ open, onClose, mode, data, onFinished }) => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const getTitle = () => {
        switch (mode) {
            case 'REPORT':
                return `Báo cáo: ${data?.name}`;
            case 'SURVEY':
                return `TK Giám sát: ${data?.name}`;
            case 'MECH':
                return `CG xử lý: ${data?.name}`;
            case 'REVIEW':
                return `Nhận xét: ${data?.name}`;
            case 'PUMPING':
                return `Báo cáo Trạm bơm: ${data?.name}`;
            default:
                return 'Tác vụ nhân viên';
        }
    };

    const renderForm = () => {
        if (!data) return null;

        switch (mode) {
            case 'REPORT':
                return (
                    <InundationReportPanel 
                        selectedReport={data.active_report} 
                        pointId={data.id} 
                        initialStreetName={data.name} 
                        onSuccess={onFinished} 
                        isCorrectionMode={data.active_report?.needs_correction}
                    />
                );
            case 'SURVEY':
                return <SurveyActionForm point={data} onFinished={onFinished} onClose={onClose} />;
            case 'MECH':
                return <MechActionForm point={data} onFinished={onFinished} onClose={onClose} />;
            case 'REVIEW':
                return <ReviewActionForm point={data} onFinished={onFinished} onClose={onClose} />;
            case 'PUMPING':
                return <PumpingStationReport station={data} onSuccess={onFinished} onClose={onClose} />;
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
            PaperProps={{
                sx: {
                    borderRadius: fullScreen ? 0 : 3,
                    backgroundImage: 'none'
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
