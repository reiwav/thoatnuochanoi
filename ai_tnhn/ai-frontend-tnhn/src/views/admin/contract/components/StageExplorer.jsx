import React from 'react';
import { Box, Typography, Stack, IconButton, Grid } from '@mui/material';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { getStageStatus } from '../utils';

const StageExplorer = ({ 
    stages, 
    activeStageIdx, 
    setActiveStageIdx, 
    addStage, 
    handleRemoveStageWithSelection 
}) => {
    return (
        <Grid item xs={12} md={3} sx={{ pl: '0px !important', pt: '0px !important' }}>
            <Box 
                sx={{ 
                    p: 2, 
                    border: '1px solid rgba(226, 232, 240, 0.8)', 
                    borderRadius: '12px', 
                    bgcolor: '#ffffff',
                    boxShadow: '0 2px 8px rgba(149, 157, 165, 0.01)',
                    height: '480px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>Các giai đoạn</Typography>
                    <IconButton 
                        size="small" 
                        color="secondary" 
                        onClick={addStage}
                        sx={{ bgcolor: 'rgba(124, 77, 255, 0.08)', '&:hover': { bgcolor: 'rgba(124, 77, 255, 0.15)' } }}
                    >
                        <IconPlus size={16} />
                    </IconButton>
                </Box>
                
                <Stack spacing={1} sx={{ overflowY: 'auto', flex: 1, pr: 0.5 }}>
                    {stages.map((stage, idx) => {
                        const isActive = idx === activeStageIdx;
                        return (
                            <Box
                                key={idx}
                                onClick={() => setActiveStageIdx(idx)}
                                sx={{
                                    p: 1.5,
                                    border: '1px solid',
                                    borderColor: isActive ? '#7c4dff' : 'rgba(226, 232, 240, 0.8)',
                                    borderRadius: '8px',
                                    bgcolor: isActive ? 'rgba(124, 77, 255, 0.04)' : '#ffffff',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    '&:hover': {
                                        borderColor: isActive ? '#7c4dff' : 'rgba(124, 77, 255, 0.3)',
                                        bgcolor: isActive ? 'rgba(124, 77, 255, 0.04)' : 'rgba(124, 77, 255, 0.01)'
                                    }
                                }}
                            >
                                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                                    <Box sx={{ flex: 1, pr: 1 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: isActive ? '#7c4dff' : 'text.primary', noWrap: true, fontSize: '0.85rem' }}>
                                            {stage.name || `Giai đoạn ${idx + 1}`}
                                        </Typography>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                                            {stage.amount ? (
                                                <Typography variant="caption" sx={{ fontWeight: 600, color: 'success.main', fontSize: '0.72rem' }}>
                                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stage.amount)}
                                                </Typography>
                                            ) : null}
                                            {(() => {
                                                const status = getStageStatus(stage);
                                                return (
                                                    <Box 
                                                        sx={{ 
                                                            px: 0.75, 
                                                            py: 0.05, 
                                                            borderRadius: '10px', 
                                                            fontSize: '0.62rem', 
                                                            fontWeight: 700, 
                                                            bgcolor: status.bgColor, 
                                                            color: status.textColor, 
                                                            border: status.border,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 0.3
                                                        }}
                                                    >
                                                        <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: status.textColor, display: 'inline-block' }} />
                                                        {status.label}
                                                    </Box>
                                                );
                                            })()}
                                        </Stack>
                                    </Box>
                                    <IconButton 
                                        size="small" 
                                        color="error" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveStageWithSelection(idx);
                                        }}
                                        disabled={stages.length === 1}
                                        sx={{ p: 0.5 }}
                                    >
                                        <IconTrash size={14} />
                                    </IconButton>
                                </Stack>
                            </Box>
                        );
                    })}
                </Stack>
            </Box>
        </Grid>
    );
};

export default StageExplorer;
