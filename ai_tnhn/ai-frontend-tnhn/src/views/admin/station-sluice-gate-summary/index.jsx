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

const SluiceGateSummaryCard = ({ gate, getOrgNames, onReport, onHistory, hasPermission, isCompany, user }) => {
    const theme = useTheme();
    const lastReport = gate.last_report;

    const canReport = hasPermission('sluice-gate:edit') && (isCompany || user?.org_id === gate.org_id);

    return (
        <Paper sx={{
            p: 2.2,
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            height: '100%',
            position: 'relative',
            '&:hover': {
                boxShadow: theme.shadows[4],
                borderColor: theme.palette.primary.main
            },
            transition: 'all 0.2s'
        }}>
            {/* Title / Header */}
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.dark', mb: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {gate.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                    📍 {gate.address || 'Không có địa chỉ'}
                </Typography>
            </Box>

            {/* Manager and Summary Info */}
            <Stack direction="row" spacing={2} justifyContent="space-between" sx={{ mt: 0.5 }}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.2, textTransform: 'uppercase', letterSpacing: 0.5 }}>ĐƠN VỊ QUẢN LÝ</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {getOrgNames(gate.org_id)}
                    </Typography>
                </Box>
                <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.2, textTransform: 'uppercase', letterSpacing: 0.5 }}>TỔNG SỐ CỬA</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {gate.quantity || 0}
                    </Typography>
                </Box>
            </Stack>

            {/* Visual Doors Grid */}
            {gate.quantity > 0 && (
                <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Trạng thái các cửa
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                        {Array.from({ length: gate.quantity || 0 }).map((_, idx) => {
                            const doorState = gate.doors?.[idx] || false;
                            const color = doorState ? theme.palette.error.main : theme.palette.success.main;
                            const bgColor = doorState ? alpha(theme.palette.error.main, 0.08) : alpha(theme.palette.success.main, 0.08);
                            const borderColor = doorState ? alpha(theme.palette.error.main, 0.25) : alpha(theme.palette.success.main, 0.25);

                            return (
                                <Box 
                                    key={idx}
                                    sx={{
                                        py: 0.6,
                                        px: 1,
                                        borderRadius: 2,
                                        bgcolor: bgColor,
                                        border: '1px solid',
                                        borderColor: borderColor,
                                        textAlign: 'center',
                                        minWidth: 65,
                                        flexGrow: 1
                                    }}
                                >
                                    <Typography variant="caption" sx={{ fontWeight: 800, color: color, display: 'block', fontSize: '0.65rem' }}>
                                        CỬA {idx + 1}
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 900, color: color, fontSize: '0.8rem', mt: 0.1 }}>
                                        {doorState ? 'MỞ' : 'ĐÓNG'}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Stack>
                </Box>
            )}

            {/* Last Update & Note */}
            {lastReport ? (
                <Box sx={{ mt: 'auto', pt: 1.5 }}>
                    <Box sx={{ p: 1.2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                🕐 {new Date(lastReport.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {new Date(lastReport.timestamp * 1000).toLocaleDateString()}
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                👤 {lastReport.user_name}
                            </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', fontSize: '0.75rem', color: 'text.secondary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            "{lastReport.note || 'Không có ghi chú'}"
                        </Typography>
                    </Box>
                </Box>
            ) : (
                <Typography variant="caption" color="text.disabled" sx={{ mt: 'auto', pt: 1.5, fontStyle: 'italic' }}>
                    Chưa có báo cáo vận hành
                </Typography>
            )}

            {/* Card Actions */}
            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1.5, mt: 1 }}>
                <Tooltip title="Lịch sử vận hành">
                    <IconButton color="info" size="small" onClick={() => onHistory(gate)} sx={{ borderRadius: 2 }}>
                        <IconHistory size={18} />
                    </IconButton>
                </Tooltip>
                {canReport && (
                    <Tooltip title="Báo cáo vận hành">
                        <IconButton color="secondary" size="small" onClick={() => onReport(gate)} sx={{ borderRadius: 2 }}>
                            <IconDeviceFloppy size={18} />
                        </IconButton>
                    </Tooltip>
                )}
            </Stack>
        </Paper>
    );
};

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
