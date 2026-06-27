import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, CircularProgress, Tabs, Tab, Box
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { IconInfoCircle, IconTimeline } from '@tabler/icons-react';
import ContractStages from './ContractStages';
import ContractGeneralTab from './components/ContractGeneralTab';

// Hook
import { useContractDialog } from './hooks/useContractDialog';

const ContractDialog = ({ open, onClose, onSubmit, contract, isEdit }) => {
    const {
        values,
        setValues,
        uploading,
        setUploading,
        submitting,
        categories,
        handleChange,
        handleStageChange,
        addStage,
        removeStage,
        handleSave
    } = useContractDialog({ open, onClose, onSubmit, contract, isEdit });

    const [tabValue, setTabValue] = useState(0);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Dialog 
                open={open} 
                onClose={(event, reason) => {
                    if (reason === 'backdropClick') return;
                    onClose();
                }}
                maxWidth="lg" 
                fullWidth
                scroll="paper"
                slotProps={{ 
                    paper: { 
                        sx: { 
                            borderRadius: '16px', 
                            boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.12)',
                            border: '1px solid rgba(226, 232, 240, 0.8)',
                            maxHeight: '90vh'
                        } 
                    } 
                }}
            >
                <DialogTitle sx={{ p: 2, pb: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h3" component="div" sx={{ fontWeight: 800, letterSpacing: '-0.5px', color: '#1e293b' }}>
                        {isEdit ? 'Chỉnh sửa hợp đồng' : 'Thêm hợp đồng mới'}
                    </Typography>
                </DialogTitle>
                
                {/* Top-level Navigation Tabs */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                    <Tabs 
                        value={tabValue} 
                        onChange={handleTabChange} 
                        textColor="secondary" 
                        indicatorColor="secondary"
                        sx={{
                            minHeight: '40px',
                            '& .MuiTab-root': {
                                fontWeight: 700,
                                textTransform: 'none',
                                fontSize: '0.9rem',
                                minHeight: '40px',
                                py: 1,
                                gap: 1,
                                px: 0.5,
                                mr: 2,
                                color: '#64748b',
                                '&.Mui-selected': {
                                    color: '#7c4dff'
                                }
                            },
                            '& .MuiTabs-indicator': {
                                height: '3px',
                                borderRadius: '3px',
                                bgcolor: '#7c4dff'
                            }
                        }}
                    >
                        <Tab icon={<IconInfoCircle size={16} />} iconPosition="start" label="Thông tin chung" />
                        <Tab icon={<IconTimeline size={16} />} iconPosition="start" label="Kế hoạch & Giai đoạn" />
                    </Tabs>
                </Box>

                <DialogContent dividers sx={{ p: 2, bgcolor: '#fafafa' }}>
                    {/* Tab 0: General Info */}
                    {tabValue === 0 && (
                        <ContractGeneralTab
                            values={values}
                            setValues={setValues}
                            categories={categories}
                            handleChange={handleChange}
                            uploading={uploading}
                            setUploading={setUploading}
                        />
                    )}

                    {/* Tab 1: Stages & Milestones */}
                    {tabValue === 1 && (
                        <ContractStages 
                            values={values}
                            setValues={setValues}
                            uploading={uploading}
                            setUploading={setUploading}
                            stages={values.stages}
                            handleStageChange={handleStageChange}
                            addStage={addStage}
                            removeStage={removeStage}
                        />
                    )}
                </DialogContent>

                <DialogActions sx={{ p: 1.5, px: 3 }}>
                    <Button onClick={onClose} color="inherit" disabled={submitting || uploading} sx={{ textTransform: 'none', fontWeight: 600 }}>Hủy bỏ</Button>
                    <Button 
                        onClick={handleSave} 
                        variant="contained" 
                        color="secondary"
                        disabled={!values.name || submitting || uploading}
                        startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
                        sx={{ 
                            borderRadius: '8px', 
                            px: 4, 
                            fontWeight: 700,
                            textTransform: 'none',
                            boxShadow: '0 2px 8px rgba(124, 77, 255, 0.15)'
                        }}
                    >
                        {submitting ? 'Đang lưu...' : (isEdit ? 'Cập nhật' : 'Thêm mới')}
                    </Button>
                </DialogActions>
            </Dialog>
        </LocalizationProvider>
    );
};

export default ContractDialog;
