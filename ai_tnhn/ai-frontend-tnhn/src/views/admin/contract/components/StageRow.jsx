import React, { useState } from 'react';
import { TableRow, TableCell, IconButton, Collapse, Box, Tabs, Tab, Typography, Menu, MenuItem } from '@mui/material';
import { IconPlus, IconMinus } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { getStageStatus } from '../utils';
import useContractStore from 'store/useContractStore';
import { toast } from 'react-hot-toast';

import StageAppendicesTable from './StageAppendicesTable';
import StageAcceptancesTable from './StageAcceptancesTable';
import StagePaymentsTable from './StagePaymentsTable';

const StageRow = ({ stage, idx, contract, formatPrice }) => {
    const [isStageExpanded, setIsStageExpanded] = useState(false);
    const [subTabIdx, setSubTabIdx] = useState(0);

    const { updateContract, fetchContracts } = useContractStore();

    // Stage Menu States
    const [stageAnchorEl, setStageAnchorEl] = useState(null);
    const isStageMenuOpen = Boolean(stageAnchorEl);

    // Sub-tables Menu States
    const [appAnchorEl, setAppAnchorEl] = useState(null);
    const [selectedAppIdx, setSelectedAppIdx] = useState(null);
    const isAppMenuOpen = Boolean(appAnchorEl);

    const [bbntAnchorEl, setBbntAnchorEl] = useState(null);
    const [selectedBbntIdx, setSelectedBbntIdx] = useState(null);
    const isBbntMenuOpen = Boolean(bbntAnchorEl);

    const handleSubTabChange = (event, newValue) => {
        setSubTabIdx(newValue);
    };

    // Stage Status Handlers
    const handleStageStatusClick = (event) => {
        event.stopPropagation();
        setStageAnchorEl(event.currentTarget);
    };

    const handleStageStatusClose = (event) => {
        if (event) event.stopPropagation();
        setStageAnchorEl(null);
    };

    const handleUpdateStageStatus = async (newStatus, event) => {
        if (event) event.stopPropagation();
        handleStageStatusClose();
        try {
            const updatedStages = contract.stages.map((s, sIdx) => {
                if (sIdx === idx) {
                    return { ...s, status: newStatus };
                }
                return s;
            });
            await updateContract(contract.id, { ...contract, stages: updatedStages });
            await fetchContracts();
            toast.success('Cập nhật trạng thái giai đoạn thành công');
        } catch (err) {
            toast.error('Lỗi khi cập nhật trạng thái');
        }
    };

    // Appendix Status Handlers
    const handleAppStatusClick = (event, appIdx) => {
        event.stopPropagation();
        setSelectedAppIdx(appIdx);
        setAppAnchorEl(event.currentTarget);
    };

    const handleAppStatusClose = (event) => {
        if (event) event.stopPropagation();
        setAppAnchorEl(null);
        setSelectedAppIdx(null);
    };

    const handleUpdateAppStatus = async (newStatus, event) => {
        if (event) event.stopPropagation();
        const appIdx = selectedAppIdx;
        handleAppStatusClose();
        try {
            const updatedStages = contract.stages.map((s, sIdx) => {
                if (sIdx === idx) {
                    const updatedApps = s.appendices.map((app, aIdx) => {
                        if (aIdx === appIdx) {
                            return { ...app, status: newStatus };
                        }
                        return app;
                    });
                    return { ...s, appendices: updatedApps };
                }
                return s;
            });
            await updateContract(contract.id, { ...contract, stages: updatedStages });
            await fetchContracts();
            toast.success('Cập nhật trạng thái phụ lục thành công');
        } catch (err) {
            toast.error('Lỗi khi cập nhật trạng thái phụ lục');
        }
    };

    // BBNT Status Handlers
    const handleBbntStatusClick = (event, bbntIdx) => {
        event.stopPropagation();
        setSelectedBbntIdx(bbntIdx);
        setBbntAnchorEl(event.currentTarget);
    };

    const handleBbntStatusClose = (event) => {
        if (event) event.stopPropagation();
        setBbntAnchorEl(null);
        setSelectedBbntIdx(null);
    };

    const handleUpdateBbntStatus = async (newStatus, event) => {
        if (event) event.stopPropagation();
        const bbntIdx = selectedBbntIdx;
        handleBbntStatusClose();
        try {
            const updatedStages = contract.stages.map((s, sIdx) => {
                if (sIdx === idx) {
                    const updatedRecs = s.acceptance_records.map((rec, rIdx) => {
                        if (rIdx === bbntIdx) {
                            return { ...rec, status: newStatus };
                        }
                        return rec;
                    });
                    return { ...s, acceptance_records: updatedRecs };
                }
                return s;
            });
            await updateContract(contract.id, { ...contract, stages: updatedStages });
            await fetchContracts();
            toast.success('Cập nhật trạng thái nghiệm thu thành công');
        } catch (err) {
            toast.error('Lỗi khi cập nhật trạng thái nghiệm thu');
        }
    };

    return (
        <React.Fragment>
            <TableRow 
                hover 
                onClick={() => setIsStageExpanded(!isStageExpanded)} 
                sx={{ 
                    cursor: 'pointer', 
                    bgcolor: isStageExpanded ? 'rgba(124, 77, 255, 0.04)' : 'transparent',
                    '&:hover': { bgcolor: isStageExpanded ? 'rgba(124, 77, 255, 0.08)' : 'grey.50' },
                    transition: 'background-color 0.15s'
                }}
            >
                <TableCell component="th" scope="row" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <IconButton 
                        size="small" 
                        sx={{ 
                            p: '2px', 
                            bgcolor: isStageExpanded ? '#f1f5f9' : 'transparent',
                            border: '1px solid rgba(226, 232, 240, 0.8)',
                            color: isStageExpanded ? '#7c4dff' : '#64748b',
                            borderRadius: '6px',
                            transition: 'all 0.15s',
                            '&:hover': { bgcolor: '#f1f5f9', color: '#7c4dff' }
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsStageExpanded(!isStageExpanded);
                        }}
                    >
                        {isStageExpanded ? <IconMinus size={12} /> : <IconPlus size={12} />}
                    </IconButton>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', mr: 1 }}>
                        {stage.name || `Giai đoạn ${idx + 1}`}
                    </Typography>
                    
                    {/* Interactive Stage Status Badge */}
                    {(() => {
                        const status = getStageStatus(stage);
                        return (
                            <Box 
                                onClick={handleStageStatusClick}
                                sx={{ 
                                    px: 1, 
                                    py: 0.15, 
                                    borderRadius: '12px', 
                                    fontSize: '0.68rem', 
                                    fontWeight: 700, 
                                    bgcolor: status.bgColor, 
                                    color: status.textColor, 
                                    border: status.border,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    '&:hover': {
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                                        transform: 'scale(1.03)',
                                        borderColor: status.textColor
                                    }
                                }}
                            >
                                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: status.textColor, display: 'inline-block' }} />
                                <span style={{ display: 'inline-block', lineHeight: 1 }}>{status.label}</span>
                                <span style={{ fontSize: '0.55rem', marginLeft: '3px', opacity: 0.8 }}>▼</span>
                            </Box>
                        );
                    })()}

                    {/* Stage Status Select Menu */}
                    <Menu
                        anchorEl={stageAnchorEl}
                        open={isStageMenuOpen}
                        onClose={handleStageStatusClose}
                        sx={{
                            '& .MuiPaper-root': {
                                borderRadius: '8px',
                                boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
                                mt: 0.5
                            }
                        }}
                    >
                        <MenuItem onClick={(e) => handleUpdateStageStatus('Chưa thực hiện', e)} sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', '&:hover': { bgcolor: '#f1f5f9' } }}>Chưa thực hiện</MenuItem>
                        <MenuItem onClick={(e) => handleUpdateStageStatus('Đang thực hiện', e)} sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#b45309', '&:hover': { bgcolor: '#fffbeb' } }}>Đang thực hiện</MenuItem>
                        <MenuItem onClick={(e) => handleUpdateStageStatus('Đã nghiệm thu', e)} sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#1d4ed8', '&:hover': { bgcolor: '#eff6ff' } }}>Đã nghiệm thu</MenuItem>
                        <MenuItem onClick={(e) => handleUpdateStageStatus('Đã thanh toán', e)} sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d', '&:hover': { bgcolor: '#f0fdf4' } }}>Đã thanh toán</MenuItem>
                    </Menu>
                </TableCell>
                <TableCell sx={{ fontSize: '0.85rem', color: '#475569' }}>
                    {stage.date ? dayjs(stage.date).format('DD/MM/YYYY') : '---'}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                    {formatPrice(stage.amount)}
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0, borderBottom: isStageExpanded ? '1px solid rgba(224, 224, 224, 1)' : 'none' }} colSpan={3}>
                    <Collapse in={isStageExpanded} timeout="auto" unmountOnExit>
                        <Box 
                            sx={{ 
                                py: 2, 
                                px: 2.5, 
                                bgcolor: '#f8fafc', 
                                border: '1px solid rgba(226, 232, 240, 0.8)',
                                borderLeft: '4px solid #7c4dff',
                                borderRadius: '0 10px 10px 0', 
                                mb: 1.5,
                                mt: 0.5,
                                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)'
                            }}
                        >
                            
                            {/* Premium Segmented Controller */}
                            <Box 
                                sx={{ 
                                    bgcolor: 'rgba(148, 163, 184, 0.12)', 
                                    borderRadius: '8px', 
                                    p: '2px', 
                                    display: 'inline-flex',
                                    mb: 1.5
                                }}
                            >
                                <Tabs 
                                    value={subTabIdx} 
                                    onChange={handleSubTabChange} 
                                    textColor="secondary" 
                                    indicatorColor="none"
                                    TabIndicatorProps={{ style: { display: 'none' } }}
                                    sx={{
                                        minHeight: '28px',
                                        '& .MuiTabs-flexContainer': { gap: 0 }
                                    }}
                                >
                                    {[
                                        `Phụ lục (${stage.appendices?.length || 0})`,
                                        `Nghiệm thu BBNT (${stage.acceptance_records?.length || 0})`,
                                        `Thanh toán BBTT (${stage.payment_records?.length || 0})`
                                    ].map((label, tIdx) => (
                                        <Tab 
                                            key={tIdx}
                                            label={label} 
                                            sx={{
                                                textTransform: 'none',
                                                fontWeight: 700,
                                                minHeight: '28px',
                                                py: 0.25,
                                                px: 1.5,
                                                fontSize: '0.72rem',
                                                borderRadius: '6px',
                                                color: '#64748b',
                                                transition: 'all 0.15s',
                                                '&.Mui-selected': {
                                                    color: '#1e293b',
                                                    bgcolor: '#ffffff',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                                                }
                                            }}
                                        />
                                    ))}
                                </Tabs>
                            </Box>

                            {/* Render active sub-tab content */}
                            {subTabIdx === 0 && (
                                <StageAppendicesTable
                                    stage={stage}
                                    appAnchorEl={appAnchorEl}
                                    isAppMenuOpen={isAppMenuOpen}
                                    handleAppStatusClick={handleAppStatusClick}
                                    handleAppStatusClose={handleAppStatusClose}
                                    handleUpdateAppStatus={handleUpdateAppStatus}
                                />
                            )}

                            {subTabIdx === 1 && (
                                <StageAcceptancesTable
                                    stage={stage}
                                    bbntAnchorEl={bbntAnchorEl}
                                    isBbntMenuOpen={isBbntMenuOpen}
                                    handleBbntStatusClick={handleBbntStatusClick}
                                    handleBbntStatusClose={handleBbntStatusClose}
                                    handleUpdateBbntStatus={handleUpdateBbntStatus}
                                />
                            )}

                            {subTabIdx === 2 && (
                                <StagePaymentsTable stage={stage} />
                            )}
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
};

export default StageRow;
