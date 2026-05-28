import React from 'react';
import {
    Box, Typography, Paper, FormControl, Select, MenuItem, Button, Stack, Divider
} from '@mui/material';
import { IconFileSpreadsheet, IconChartBar, IconRefresh } from '@tabler/icons-react';

const CompareHeader = ({
    year1,
    setYear1,
    year2,
    setYear2,
    years,
    loading,
    reportData,
    hasPermission,
    loadReport,
    exportToExcel
}) => {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box>
                <Typography variant="h3" sx={{ fontWeight: 800, color: '#1a237e', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconChartBar size={28} /> BÁO CÁO SO SÁNH LƯỢNG MƯA
                </Typography>
                <Typography variant="subtitle2" color="text.secondary">
                    Thống kê và so sánh tỷ lệ lượng mưa giữa các năm theo trạm đo
                </Typography>
            </Box>

            <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: '#fff', border: '1px solid #e0e0e0', display: 'flex', gap: 2, alignItems: 'center' }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>So sánh:</Typography>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <Select
                            value={year1}
                            onChange={(e) => setYear1(e.target.value)}
                            sx={{ borderRadius: 2, fontWeight: 600 }}
                        >
                            {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>với:</Typography>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <Select
                            value={year2}
                            onChange={(e) => setYear2(e.target.value)}
                            sx={{ borderRadius: 2, fontWeight: 600 }}
                        >
                            {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Stack>
                <Divider orientation="vertical" flexItem />
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="contained"
                        disabled={loading}
                        onClick={loadReport}
                        startIcon={<IconRefresh size={18} />}
                        sx={{ borderRadius: 2, bgcolor: '#3949ab', boxShadow: 'none', '&:hover': { bgcolor: '#283593', boxShadow: '0 4px 12px rgba(57,73,171,0.2)' } }}
                    >
                        Duyệt báo cáo
                    </Button>
                    {hasPermission('rain:export') && (
                        <Button
                            variant="outlined"
                            disabled={loading || !reportData}
                            onClick={exportToExcel}
                            startIcon={<IconFileSpreadsheet size={18} />}
                            sx={{ borderRadius: 2, border: '1px solid #e0e0e0', color: '#455a64', '&:hover': { bgcolor: '#f5f5f5', border: '1px solid #cfd8dc' } }}
                        >
                            Xuất Excel
                        </Button>
                    )}
                </Stack>
            </Paper>
        </Box>
    );
};

export default CompareHeader;
