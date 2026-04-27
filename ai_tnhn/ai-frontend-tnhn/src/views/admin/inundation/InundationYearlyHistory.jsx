import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    CircularProgress, Typography, FormControl, InputLabel, Select, MenuItem, Stack, Box, Button,
    Dialog, DialogTitle, DialogContent, IconButton, Grid, Divider, useMediaQuery, Chip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconFileExport, IconEye, IconX, IconClock, IconRulerMeasure } from '@tabler/icons-react';
import dayjs from 'dayjs';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import inundationApi from 'api/inundation';
import organizationApi from 'api/organization';
import useAuthStore from 'store/useAuthStore';
import OrganizationSelect from 'ui-component/filter/OrganizationSelect';
import InundationHistoryDialog from '../../shared/inundation/InundationHistoryDialog';

const InundationYearlyHistory = () => {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [year, setYear] = useState(dayjs().year());
    const [history, setHistory] = useState([]);
    const [selectedPoint, setSelectedPoint] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const [selectedOrgId, setSelectedOrgId] = useState('');
    const { role, isCompany } = useAuthStore();
    const canFilterAllOrgs = role === 'super_admin' || isCompany;

    const years = [];
    for (let y = dayjs().year(); y >= 2024; y--) {
        years.push(y);
    }

    const loadHistory = useCallback(async () => {
        setLoading(true);
        try {
            const res = await inundationApi.getYearlyHistory(year, selectedOrgId);
            setHistory(Array.isArray(res) ? res : (res?.data?.data || res || []));
        } catch (err) {
            console.error('Failed to load yearly history:', err);
        } finally {
            setLoading(false);
        }
    }, [year, selectedOrgId]);

    const handleExport = async () => {
        try {
            const response = await inundationApi.exportYearlyHistory(year, selectedOrgId);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `lich_su_ngap_${year}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    // Helper to format duration (seconds) into "Xh Yph"
    const formatDuration = (seconds) => {
        if (!seconds || seconds <= 0) return '0 ph';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}ph`;
        return `${m}ph`;
    };

    // Aggregate data by Point
    const aggregatedData = useMemo(() => {
        const groups = {};
        const now = dayjs().unix();

        history.forEach(item => {
            const id = item.point_id || item.street_name;
            if (!groups[id]) {
                groups[id] = {
                    ...item,
                    count: 0,
                    total_duration: 0,
                    events: []
                };
            }
            groups[id].count += 1;

            // If not resolved, use current time - created_at
            const endTime = item.end_time > 0 ? item.end_time : now;
            const durationSeconds = Math.max(0, endTime - item.created_at);

            groups[id].total_duration += durationSeconds;
            groups[id].events.push({
                ...item,
                durationSeconds
            });
        });

        // Sort events within each group by created_at descending
        Object.values(groups).forEach(group => {
            group.events.sort((a, b) => b.created_at - a.created_at);
        });

        return Object.values(groups);
    }, [history]);

    const handleViewDetails = (point) => {
        setSelectedPoint(point);
        setDetailOpen(true);
    };

    return (
        <MainCard title={<Typography variant="h3" align="center" sx={{ textTransform: 'uppercase', py: 1 }}>Xem số liệu theo năm</Typography>}>
            <Stack spacing={3}>
                <Stack direction="row" spacing={2} alignItems="center" justifyContent="flex-start">
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Chọn năm</InputLabel>
                        <Select
                            value={year}
                            label="Chọn năm"
                            onChange={(e) => setYear(e.target.value)}
                        >
                            {years.map((y) => (
                                <MenuItem key={y} value={y}>{y}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {canFilterAllOrgs && (
                        <OrganizationSelect
                            value={selectedOrgId}
                            onChange={(e) => setSelectedOrgId(e.target.value)}
                            label="Chọn xí nghiệp"
                            sx={{ maxWidth: 300 }}
                        />
                    )}

                    <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<IconFileExport size="1.2rem" />}
                        onClick={handleExport}
                        sx={{ borderRadius: '8px', boxShadow: 'none' }}
                    >
                        Xuất ra Excel
                    </Button>
                </Stack>

                {/* Main Yearly Summary - Desktop Table */}
                <TableContainer component={Paper} sx={{ display: { xs: 'none', md: 'block' }, border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '4px' }}>
                    <Table>
                        <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                            <TableRow>
                                <TableCell align="center" sx={{ fontWeight: 800, width: '60px', borderRight: '1px solid #ddd' }}>STT</TableCell>
                                <TableCell sx={{ fontWeight: 800, borderRight: '1px solid #ddd' }}>Điểm ngập / Địa bàn</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, width: '100px', borderRight: '1px solid #ddd' }}>Đơn vị</TableCell>
                                <TableCell sx={{ fontWeight: 800, borderRight: '1px solid #ddd' }}>Địa điểm / Quận</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, width: '120px', borderRight: '1px solid #ddd' }}>Số lần ngập</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, width: '180px', borderRight: '1px solid #ddd' }}>Tổng thời gian ngập</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, width: '100px' }}>Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                        <CircularProgress size={24} color="secondary" />
                                    </TableCell>
                                </TableRow>
                            ) : aggregatedData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                        Không có dữ liệu cho năm {year}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                aggregatedData.map((row, index) => (
                                    <TableRow key={row.point_id || row.street_name || index} hover>
                                        <TableCell align="center" sx={{ borderRight: '1px solid #eee' }}>{index + 1}</TableCell>
                                        <TableCell sx={{ borderRight: '1px solid #eee', fontWeight: 600 }}>{row.street_name || row.point_id}</TableCell>
                                        <TableCell align="center" sx={{ borderRight: '1px solid #eee' }}>{row.org_code}</TableCell>
                                        <TableCell sx={{ borderRight: '1px solid #eee', fontSize: '0.85rem' }}>{row.address || '...'}</TableCell>
                                        <TableCell align="center" sx={{ borderRight: '1px solid #eee', fontWeight: 700, color: 'error.main', fontSize: '1.1rem' }}>
                                            {row.count}
                                        </TableCell>
                                        <TableCell align="center" sx={{ borderRight: '1px solid #eee', fontWeight: 600 }}>
                                            {formatDuration(row.total_duration)}
                                        </TableCell>
                                        <TableCell align="center">
                                            <IconButton color="primary" onClick={() => handleViewDetails(row)}>
                                                <IconEye size={20} />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Main Yearly Summary - Mobile Cards */}
                <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                    {loading ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={30} color="secondary" /></Box>
                    ) : aggregatedData.length === 0 ? (
                        <Typography align="center" color="textSecondary" sx={{ py: 4 }}>Không có dữ liệu cho năm {year}</Typography>
                    ) : (
                        <Stack spacing={2}>
                            {aggregatedData.map((row, index) => (
                                <Paper key={index} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                        <Box>
                                            <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.dark' }}>{row.street_name || row.point_id}</Typography>
                                            <Typography variant="caption" color="textSecondary">{row.address || '...'}</Typography>
                                        </Box>
                                        <Chip label={`${row.count} lần`} color="error" size="small" sx={{ fontWeight: 800 }} />
                                    </Box>
                                    <Divider sx={{ mb: 1.5, borderStyle: 'dashed' }} />
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Box>
                                            <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>Thời gian ngập:</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatDuration(row.total_duration)}</Typography>
                                        </Box>
                                        <Button variant="outlined" size="small" onClick={() => handleViewDetails(row)}>Chi tiết</Button>
                                    </Stack>
                                </Paper>
                            ))}
                        </Stack>
                    )}
                </Box>
            </Stack>

            <InundationHistoryDialog
                open={detailOpen}
                onClose={() => setDetailOpen(false)}
                point={selectedPoint ? { id: selectedPoint.point_id, name: selectedPoint.street_name, address: selectedPoint.address, org_code: selectedPoint.org_code, count: selectedPoint.count } : null}
            />
        </MainCard>
    );
};

export default InundationYearlyHistory;
