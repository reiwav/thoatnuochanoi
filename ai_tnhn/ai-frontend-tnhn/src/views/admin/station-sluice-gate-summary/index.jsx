import React from 'react';
import { 
    Box, Typography, Stack, Avatar, Grid, TextField, 
    useTheme, Chip, alpha, Paper, Skeleton, IconButton, Tooltip, Dialog, DialogContent, DialogTitle
} from '@mui/material';
import { IconDoor, IconSearch, IconFilter, IconHistory, IconDeviceFloppy, IconX, IconMapPin, IconBuilding } from '@tabler/icons-react';

import OrganizationSelect from 'ui-component/filter/OrganizationSelect';
import SluiceGateReport from 'views/admin/sluice-gate/SluiceGateReport';
import SluiceGateHistoryDialog from 'views/admin/sluice-gate/SluiceGateHistoryDialog';
import useStationSluiceGateSummary from './hooks/useStationSluiceGateSummary';
import SluiceGateSummaryCard from './components/SluiceGateSummaryCard';

const StationSluiceGateSummary = () => {
    const theme = useTheme();
    const {
        user,
        isCompany,
        hasPermission,
        gates,
        isLoading,
        selectedOrg,
        setSelectedOrg,
        searchQuery,
        setSearchQuery,
        selectedStatus,
        setSelectedStatus,
        statusCounts,
        selectedGate,
        openReport,
        setOpenReport,
        openHistory,
        setOpenHistory,
        handleReportClick,
        handleHistoryClick,
        handleReportSuccess,
        getOrgNames
    } = useStationSluiceGateSummary();

    const statusOptions = [
        { key: 'all', label: 'Tất cả', color: theme.palette.primary.main, count: statusCounts.all },
        { key: 'open', label: 'Có cửa mở', color: '#d32f2f', count: statusCounts.open },
        { key: 'closed', label: 'Đóng hoàn toàn', color: '#2e7d32', count: statusCounts.closed }
    ];

    return (
        <Box sx={{ px: { xs: 1, md: 3 }, pt: { xs: 1.5, md: 3 }, pb: 10 }}>
            {/* Header */}
            <Box sx={{ mb: 1.5 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, boxShadow: theme.shadows[2] }}>
                        <IconDoor size={18} color="white" />
                    </Avatar>
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.dark', letterSpacing: -0.5, lineHeight: 1.2 }}>
                            GIÁM SÁT CỬA PHAI
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.6rem' }}>
                            Hệ thống giám sát trạng thái đóng mở thời gian thực
                        </Typography>
                    </Box>
                </Stack>

                {/* Filters */}
                <Grid container spacing={1.5} sx={{ mb: 1 }}>
                    <Grid item xs={12} md={8}>
                        <TextField
                            fullWidth
                            placeholder="Tìm kiếm cửa phai hoặc địa chỉ..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <IconSearch size={18} style={{ marginRight: 8, opacity: 0.5 }} />
                                    ),
                                    sx: { borderRadius: 3, bgcolor: 'background.paper', height: 42, fontSize: '0.9rem', boxShadow: '0 1px 8px rgba(0,0,0,0.03)' }
                                }
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <OrganizationSelect
                            value={selectedOrg === 'all' ? '' : selectedOrg}
                            onChange={(e) => setSelectedOrg(e.target.value || 'all')}
                            sx={{ 
                                borderRadius: 3, 
                                bgcolor: 'background.paper',
                                boxShadow: '0 1px 8px rgba(0,0,0,0.03)',
                                '& .MuiOutlinedInput-root': { height: 42, fontSize: '0.9rem' }
                            }}
                        />
                    </Grid>
                </Grid>

                {/* Status Chips Filter */}
                <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }} alignItems="center">
                    <IconFilter size={16} color={theme.palette.text.secondary} style={{ marginRight: 4 }} />
                    {statusOptions.map(opt => (
                        <Chip
                            key={opt.key}
                            label={<span>{opt.label} <span style={{ color: opt.color, fontWeight: 900 }}>({opt.count})</span></span>}
                            size="small"
                            onClick={() => setSelectedStatus(opt.key)}
                            sx={{
                                fontWeight: 800,
                                fontSize: '0.75rem',
                                borderRadius: 2,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                ...(selectedStatus === opt.key ? {
                                    bgcolor: alpha(opt.color, 0.15),
                                    color: opt.color,
                                    border: '1.5px solid',
                                    borderColor: alpha(opt.color, 0.5),
                                    boxShadow: `0 2px 8px ${alpha(opt.color, 0.2)}`
                                } : {
                                    bgcolor: 'grey.50',
                                    color: 'text.secondary',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    '&:hover': {
                                        bgcolor: alpha(opt.color, 0.08),
                                        borderColor: alpha(opt.color, 0.3),
                                        color: opt.color
                                    }
                                })
                            }}
                        />
                    ))}
                </Stack>
            </Box>

            {/* Grid of Cards */}
            {isLoading && gates.length === 0 ? (
                <Grid container spacing={2}>
                    {[1, 2, 3, 4].map(i => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                            <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 4 }} />
                        </Grid>
                    ))}
                </Grid>
            ) : gates.length === 0 ? (
                <Paper sx={{ textAlign: 'center', py: 10, borderRadius: 5, bgcolor: 'grey.50', border: '1px dashed', borderColor: 'divider' }}>
                    <Typography variant="h4" color="textSecondary" sx={{ mb: 1, fontWeight: 800 }}>Không tìm thấy cửa phai</Typography>
                    <Typography variant="body2" color="text.disabled">Vui lòng kiểm tra lại bộ lọc hoặc từ khóa tìm kiếm</Typography>
                </Paper>
            ) : (
                <Grid container spacing={2} alignItems="stretch">
                    {gates.map(gate => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={gate.id}>
                            <SluiceGateSummaryCard
                                gate={gate}
                                getOrgNames={getOrgNames}
                                onReport={handleReportClick}
                                onHistory={handleHistoryClick}
                                hasPermission={hasPermission}
                                isCompany={isCompany}
                                user={user}
                            />
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Reporting Dialog */}
            <Dialog 
                open={openReport} 
                onClose={() => setOpenReport(false)} 
                fullWidth 
                maxWidth="md"
                slotProps={{ paper: { sx: { borderRadius: 3 } } }}
            >
                <DialogTitle sx={{ p: 2, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', pb: 1 }}>
                    <IconButton onClick={() => setOpenReport(false)} size="small" sx={{ mt: -0.5, mr: -0.5 }}>
                        <IconX size={20} />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: { xs: 1.5, sm: 3 } }}>
                    {selectedGate && (
                        <SluiceGateReport station={selectedGate} onSuccess={handleReportSuccess} />
                    )}
                </DialogContent>
            </Dialog>

            {/* History Dialog */}
            {selectedGate && (
                <SluiceGateHistoryDialog
                    open={openHistory}
                    handleClose={() => setOpenHistory(false)}
                    item={selectedGate}
                />
            )}
        </Box>
    );
};

export default StationSluiceGateSummary;
