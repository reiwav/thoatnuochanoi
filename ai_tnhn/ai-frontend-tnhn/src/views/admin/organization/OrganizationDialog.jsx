import React, { useState, useEffect, useMemo } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Grid, IconButton, Stack, FormControlLabel, Switch,
    Typography, Box, Checkbox, Divider, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper, InputAdornment
} from '@mui/material';
import { IconX, IconSearch, IconChevronRight } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import stationApi from 'api/station';

// Sub-component for station selection in a table
const StationSelectionDialog = ({ open, onClose, title, stations, selectedIds, onConfirm, nameKey = 'TenTram' }) => {
    const [search, setSearch] = useState('');
    const [tempSelected, setTempSelected] = useState([]);

    useEffect(() => {
        if (open) {
            setTempSelected(selectedIds || []);
            setSearch('');
        }
    }, [open, selectedIds]);

    const filteredStations = useMemo(() => {
        return stations.filter(s =>
            (s[nameKey] || s.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (s.MaTram || s.code || '').toLowerCase().includes(search.toLowerCase()) ||
            (s.TenTramHTML || '').toLowerCase().includes(search.toLowerCase()) ||
            (s.TenPhuong || s.phuong || s.ward || '').toLowerCase().includes(search.toLowerCase())
        );
    }, [stations, search, nameKey]);

    const handleToggle = (id) => {
        setTempSelected(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = (event) => {
        if (event.target.checked) {
            const allFilteredIds = filteredStations.map(s => s.id || s._id);
            const newSelected = Array.from(new Set([...tempSelected, ...allFilteredIds]));
            setTempSelected(newSelected);
        } else {
            const allFilteredIds = filteredStations.map(s => s.id || s._id);
            setTempSelected(tempSelected.filter(id => !allFilteredIds.includes(id)));
        }
    };

    const isAllSelected = filteredStations.length > 0 && filteredStations.every(s => tempSelected.includes(s.id || s._id));

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {title}
                <IconButton onClick={onClose} size="small"><IconX size={20} /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0 }}>
                <Box sx={{ p: 2 }}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Tìm kiếm trạm..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <IconSearch size={18} />
                                </InputAdornment>
                            ),
                            sx: { borderRadius: '12px' }
                        }}
                    />
                </Box>
                <TableContainer sx={{ maxHeight: 400 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        indeterminate={tempSelected.length > 0 && !isAllSelected}
                                        checked={isAllSelected}
                                        onChange={handleSelectAll}
                                    />
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Tên trạm</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Tên HTML</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Phường/Xã</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Mã</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredStations.map((row) => {
                                const id = row.id || row._id;
                                const isItemSelected = tempSelected.includes(id);
                                return (
                                    <TableRow key={id} hover onClick={() => handleToggle(id)} sx={{ cursor: 'pointer' }}>
                                        <TableCell padding="checkbox">
                                            <Checkbox checked={isItemSelected} />
                                        </TableCell>
                                        <TableCell>{row[nameKey] || row.name}</TableCell>
                                        <TableCell>{row.TenTramHTML || '-'}</TableCell>
                                        <TableCell>{row.TenPhuong || row.phuong || row.ward || '-'}</TableCell>
                                        <TableCell>{row.MaTram || row.code || '-'}</TableCell>
                                    </TableRow>
                                );
                            })}
                            {filteredStations.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                        Không tìm thấy trạm nào
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Typography variant="body2" sx={{ mr: 'auto', ml: 1, fontWeight: 600 }}>
                    Đã chọn: {tempSelected.length}
                </Typography>
                <Button onClick={onClose} color="inherit">Hủy</Button>
                <Button variant="contained" onClick={() => onConfirm(tempSelected)} color="primary">Xác nhận</Button>
            </DialogActions>
        </Dialog>
    );
};

const OrganizationDialog = ({ open, onClose, onSubmit, organization, isEdit }) => {
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        status: true,
        address: '',
        phone_number: '',
        email: '',
        representative: '',
        rain_station_ids: [],
        lake_station_ids: [],
        river_station_ids: [],
        inundation_ids: []
    });

    const [stations, setStations] = useState({
        rain: [],
        lake: [],
        river: [],
        inundation: []
    });

    const [selectionOpen, setSelectionOpen] = useState({
        open: false,
        type: '',
        title: '',
        data: [],
        field: '',
        nameKey: 'TenTram'
    });

    const fetchStations = async () => {
        try {
            const [rainRes, lakeRes, riverRes, inundationRes] = await Promise.all([
                stationApi.rain.getAll({ per_page: 1000 }),
                stationApi.lake.getAll({ per_page: 1000 }),
                stationApi.river.getAll({ per_page: 1000 }),
                stationApi.inundation.getAll()
            ]);

            setStations({
                rain: rainRes.data?.data?.data || [],
                lake: lakeRes.data?.data?.data || [],
                river: riverRes.data?.data?.data || [],
                inundation: inundationRes.data?.data || []
            });
        } catch (err) {
            console.error('Lỗi tải danh sách trạm:', err);
        }
    };

    useEffect(() => {
        if (open) {
            fetchStations();
            if (isEdit && organization) {
                setFormData({
                    name: organization.name || '',
                    code: organization.code || '',
                    description: organization.description || '',
                    status: organization.status !== undefined ? organization.status : true,
                    address: organization.address || '',
                    phone_number: organization.phone_number || '',
                    email: organization.email || '',
                    representative: organization.representative || '',
                    rain_station_ids: organization.rain_station_ids || [],
                    lake_station_ids: organization.lake_station_ids || [],
                    river_station_ids: organization.river_station_ids || [],
                    inundation_ids: organization.inundation_ids || []
                });
            } else {
                setFormData({
                    name: '',
                    code: '',
                    description: '',
                    status: true,
                    address: '',
                    phone_number: '',
                    email: '',
                    representative: '',
                    rain_station_ids: [],
                    lake_station_ids: [],
                    river_station_ids: [],
                    inundation_ids: []
                });
            }
        }
    }, [open, isEdit, organization]);

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = () => {
        if (!formData.name) return toast.error("Vui lòng nhập Tên đơn vị");
        if (!formData.code) return toast.error("Vui lòng nhập mã công ty");
        if (!formData.phone_number) return toast.error("Vui lòng nhập số điện thoại");
        if (!formData.email) return toast.error("Vui lòng nhập email");

        onSubmit(formData);
    };

    const openSelection = (type, title, data, field, nameKey = 'TenTram') => {
        setSelectionOpen({ open: true, type, title, data, field, nameKey });
    };

    const renderSelectionTrigger = (label, field, type, data, nameKey) => (
        <Stack spacing={0.5}>
            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, ml: 1 }}>{label}</Typography>
            <Button
                fullWidth
                variant="outlined"
                onClick={() => openSelection(type, label, data, field, nameKey)}
                sx={{
                    justifyContent: 'space-between',
                    borderRadius: '12px',
                    color: 'text.primary',
                    borderColor: 'rgba(0,0,0,0.23)',
                    textTransform: 'none',
                    py: 1,
                    '&:hover': { borderColor: 'primary.main', bgcolor: 'transparent' }
                }}
                endIcon={<IconChevronRight size={18} />}
            >
                <Typography variant="body2">{formData[field].length} trạm đã được chọn</Typography>
            </Button>
        </Stack>
    );

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
                <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {isEdit ? 'Chỉnh sửa công ty' : 'Thêm công ty mới'}
                    <IconButton onClick={onClose} size="small"><IconX size={20} /></IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={3} sx={{ mt: 0.5 }}>
                        <Grid item xs={12} sm={6}>
                            <Stack spacing={2.5}>
                                <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 4, height: 16, bgcolor: 'primary.main', borderRadius: 1 }} />
                                    Thông tin cơ bản
                                </Typography>
                                <TextField
                                    fullWidth label="Tên đơn vị" required size="small"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                                />
                                <TextField
                                    fullWidth label="Mã công ty" required size="small"
                                    value={formData.code}
                                    onChange={(e) => handleChange('code', e.target.value)}
                                    disabled={isEdit}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                                />
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth label="SĐT liên hệ" required size="small"
                                            value={formData.phone_number}
                                            onChange={(e) => handleChange('phone_number', e.target.value)}
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth label="Email" required size="small"
                                            value={formData.email}
                                            onChange={(e) => handleChange('email', e.target.value)}
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                                        />
                                    </Grid>
                                </Grid>
                                <TextField
                                    fullWidth label="Người đại diện" size="small"
                                    value={formData.representative}
                                    onChange={(e) => handleChange('representative', e.target.value)}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                                />
                                <TextField
                                    fullWidth label="Địa chỉ" size="small"
                                    value={formData.address}
                                    onChange={(e) => handleChange('address', e.target.value)}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                                />
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={formData.status}
                                            onChange={(e) => handleChange('status', e.target.checked)}
                                            color="primary"
                                        />
                                    }
                                    label="Kích hoạt hoạt động"
                                />
                            </Stack>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <Stack spacing={2.5}>
                                <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 4, height: 16, bgcolor: 'primary.main', borderRadius: 1 }} />
                                    Phân quyền trạm đo
                                </Typography>
                                {renderSelectionTrigger("Trạm đo mưa", "rain_station_ids", "rain", stations.rain, "TenTram")}
                                {renderSelectionTrigger("Mực nước hồ", "lake_station_ids", "lake", stations.lake, "TenTram")}
                                {renderSelectionTrigger("Mực nước sông", "river_station_ids", "river", stations.river, "TenTram")}
                                {renderSelectionTrigger("Điểm ngập úng", "inundation_ids", "inundation", stations.inundation, "name")}

                                <Divider sx={{ my: 0.5 }} />

                                <TextField
                                    fullWidth label="Mô tả / Ghi chú" size="small"
                                    multiline rows={3.5}
                                    value={formData.description}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                                />
                            </Stack>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
                    <Button onClick={onClose} color="inherit" sx={{ borderRadius: '8px' }}>Hủy</Button>
                    <Button variant="contained" onClick={handleSave} color="primary" sx={{ borderRadius: '8px', px: 4 }}>
                        {isEdit ? 'Cập nhật' : 'Thêm mới'}
                    </Button>
                </DialogActions>
            </Dialog>

            <StationSelectionDialog
                open={selectionOpen.open}
                onClose={() => setSelectionOpen(prev => ({ ...prev, open: false }))}
                title={selectionOpen.title}
                stations={selectionOpen.data}
                selectedIds={formData[selectionOpen.field]}
                onConfirm={(newSelectedIds) => {
                    handleChange(selectionOpen.field, newSelectedIds);
                    setSelectionOpen(prev => ({ ...prev, open: false }));
                }}
                nameKey={selectionOpen.nameKey}
            />
        </>
    );
};

export default OrganizationDialog;
