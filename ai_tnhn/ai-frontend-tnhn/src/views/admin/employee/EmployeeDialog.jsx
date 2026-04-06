import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Grid, IconButton, Stack, FormControlLabel, Switch,
    FormControl, InputLabel, Select, MenuItem, CircularProgress, Box, Chip, Typography, ListSubheader
} from '@mui/material';
import { IconX } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import inundationApi from 'api/inundation';
import emergencyConstructionApi from 'api/emergencyConstruction';
import pumpingStationApi from 'api/pumpingStation';
import SelectionDialog from './SelectionDialog';
import useAuthStore from 'store/useAuthStore';
import axiosClient from 'api/axiosClient';

const EmployeeDialog = ({ open, onClose, onSubmit, employee, isEdit, organizations = [], defaultOrgId = '' }) => {
    const { hasPermission, role: userRole } = useAuthStore();
    const [points, setPoints] = useState([]);
    const [constructions, setConstructions] = useState([]);
    const [pumpingStations, setPumpingStations] = useState([]);
    const [roles, setRoles] = useState([]);
    const [fetchingData, setFetchingData] = useState(false);
    const [pointSelectionOpen, setPointSelectionOpen] = useState(false);
    const [constructionSelectionOpen, setConstructionSelectionOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'employee',
        org_id: '',
        assigned_inundation_point_ids: [],
        assigned_emergency_construction_ids: [],
        assigned_pumping_station_id: '',
        active: true
    });

    useEffect(() => {
        if (open) {
            if (isEdit && employee) {
                setFormData({
                    name: employee.name || '',
                    email: employee.email || '',
                    password: '',
                    role: employee.role || 'employee',
                    org_id: employee.org_id || defaultOrgId,
                    assigned_inundation_point_ids: employee.assigned_inundation_point_ids || [],
                    assigned_emergency_construction_ids: employee.assigned_emergency_construction_ids || [],
                    assigned_pumping_station_id: employee.assigned_pumping_station_id || '',
                    active: employee.active !== undefined ? employee.active : true
                });
            } else {
                setFormData({
                    name: '',
                    email: '',
                    password: '',
                    role: 'employee',
                    org_id: defaultOrgId,
                    assigned_inundation_point_ids: [],
                    assigned_emergency_construction_ids: [],
                    assigned_pumping_station_id: '',
                    active: true
                });
            }
        }
    }, [open, isEdit, employee, defaultOrgId]);

    useEffect(() => {
        const fetchLocationData = async () => {
            if (!open) return;
            const orgIdToUse = formData.org_id || defaultOrgId;
            setFetchingData(true);
            try {
                const [pointsRes, consRes, pumpRes, rolesRes] = await Promise.all([
                    inundationApi.getPointsStatus({ per_page: 1000, org_id: orgIdToUse }),
                    emergencyConstructionApi.getAll({ per_page: 1000, org_id: orgIdToUse }),
                    pumpingStationApi.list({ per_page: 1000 }),
                    axiosClient.get('/admin/roles')
                ]);

                if (pointsRes.data?.status === 'success') {
                    setPoints(Array.isArray(pointsRes.data.data) ? pointsRes.data.data : []);
                }

                if (consRes.data?.status === 'success') {
                    setConstructions(Array.isArray(consRes.data.data?.data) ? consRes.data.data.data : []);
                }

                if (pumpRes.data?.status === 'success') {
                    setPumpingStations(Array.isArray(pumpRes.data.data?.data) ? pumpRes.data.data.data : []);
                }

                if (rolesRes.data?.status === 'success') {
                    setRoles(rolesRes.data.data || []);
                }
            } catch (err) {
                console.error('Lỗi tải dữ liệu:', err);
            } finally {
                setFetchingData(false);
            }
        };

        fetchLocationData();
    }, [open, formData.org_id, defaultOrgId]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        if (!formData.name) return toast.error('Vui lòng nhập tên');
        if (!formData.email) return toast.error('Vui lòng nhập email');
        if (userRole !== 'admin_org' && !formData.org_id) return toast.error('Vui lòng chọn công ty');
        if (!isEdit && !formData.password) return toast.error('Vui lòng nhập mật khẩu');
        onSubmit(formData);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {isEdit ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
                <IconButton onClick={onClose} size="small"><IconX size={20} /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    <TextField
                        fullWidth label="Họ và tên" required size="small"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                    />

                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                        <TextField
                            fullWidth label="Email" required size="small"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                        />
                        <FormControl fullWidth size="small" sx={{ flex: 1 }}>
                            <InputLabel>Vai trò</InputLabel>
                            <Select
                                value={formData.role}
                                label="Vai trò"
                                onChange={(e) => handleChange('role', e.target.value)}
                                sx={{ borderRadius: '12px', bgcolor: '#f8fafc' }}
                            >
                                {roles.length === 0 ? (
                                    <MenuItem value={formData.role}>
                                        <CircularProgress size={14} sx={{ mr: 1 }} /> Đang tải...
                                    </MenuItem>
                                ) : (
                                    roles.map((r) => (
                                        <MenuItem key={r.code} value={r.code}>
                                            {r.name}
                                        </MenuItem>
                                    ))
                                )}

                                {!roles.find(r => r.code === 'employee') && (
                                    <MenuItem value="employee">Employee (Legacy)</MenuItem>
                                )}
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Org selector dropdown - Only for Super Admin */}
                    {hasPermission('organization:view') && (
                        <FormControl fullWidth size="small">
                            <InputLabel>Công ty / Xí nghiệp *</InputLabel>
                            <Select
                                value={formData.org_id}
                                label="Công ty / Xí nghiệp *"
                                onChange={(e) => handleChange('org_id', e.target.value)}
                                disabled={!!defaultOrgId} // disable if came from org page
                                sx={{ borderRadius: '12px', bgcolor: defaultOrgId ? '#f0f0f0' : '#f8fafc' }}
                            >
                                {organizations.map((org) => (
                                    <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    {formData.role === 'employee' && (
                        <>
                            <Box>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>Điểm ngập được giao</Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {formData.assigned_inundation_point_ids.length > 0
                                                ? `Đã chọn ${formData.assigned_inundation_point_ids.length} điểm`
                                                : 'Chưa có điểm nào được chọn'}
                                        </Typography>
                                    </Box>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        color="secondary"
                                        onClick={() => setPointSelectionOpen(true)}
                                        sx={{ borderRadius: '8px', fontWeight: 700 }}
                                    >
                                        Thay đổi
                                    </Button>
                                </Stack>
                                <Box sx={{
                                    display: 'flex', flexWrap: 'wrap', gap: 0.8,
                                    p: 1.5, border: '1px dashed', borderColor: 'divider',
                                    borderRadius: '12px', bgcolor: '#fdfdfd', minHeight: 48
                                }}>
                                    {formData.assigned_inundation_point_ids.length === 0 ? (
                                        <Typography variant="caption" color="textSecondary" sx={{ fontStyle: 'italic' }}>Chưa có điểm nào</Typography>
                                    ) : (
                                        formData.assigned_inundation_point_ids.slice(0, 8).map((id) => {
                                            const point = points.find(p => p.id === id);
                                            return <Chip key={id} label={point ? point.name : id} size="small" sx={{ fontWeight: 600 }} />;
                                        })
                                    )}
                                    {formData.assigned_inundation_point_ids.length > 8 && (
                                        <Chip label={`+${formData.assigned_inundation_point_ids.length - 8} mục nữa`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                                    )}
                                </Box>
                            </Box>

                            <Box>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5, mt: 1 }}>
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>Công trình được giao</Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {formData.assigned_emergency_construction_ids.length > 0
                                                ? `Đã chọn ${formData.assigned_emergency_construction_ids.length} công trình`
                                                : 'Chưa có công trình nào được chọn'}
                                        </Typography>
                                    </Box>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        color="secondary"
                                        onClick={() => setConstructionSelectionOpen(true)}
                                        sx={{ borderRadius: '8px', fontWeight: 700 }}
                                    >
                                        Thay đổi
                                    </Button>
                                </Stack>
                                <Box sx={{
                                    display: 'flex', flexWrap: 'wrap', gap: 0.8,
                                    p: 1.5, border: '1px dashed', borderColor: 'divider',
                                    borderRadius: '12px', bgcolor: '#fdfdfd', minHeight: 48
                                }}>
                                    {formData.assigned_emergency_construction_ids.length === 0 ? (
                                        <Typography variant="caption" color="textSecondary" sx={{ fontStyle: 'italic' }}>Chưa có công trình nào</Typography>
                                    ) : (
                                        formData.assigned_emergency_construction_ids.slice(0, 8).map((id) => {
                                            const cons = constructions.find(c => c.id === id);
                                            return <Chip key={id} label={cons ? cons.name : id} size="small" sx={{ fontWeight: 600 }} />;
                                        })
                                    )}
                                    {formData.assigned_emergency_construction_ids.length > 8 && (
                                        <Chip label={`+${formData.assigned_emergency_construction_ids.length - 8} mục nữa`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                                    )}
                                </Box>
                            </Box>

                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mb: 1 }}>Trạm bơm được giao</Typography>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Chọn trạm bơm</InputLabel>
                                    <Select
                                        value={formData.assigned_pumping_station_id}
                                        label="Chọn trạm bơm"
                                        onChange={(e) => handleChange('assigned_pumping_station_id', e.target.value)}
                                        sx={{ borderRadius: '12px', bgcolor: '#f8fafc' }}
                                    >
                                        <MenuItem value=""><em>Không gán</em></MenuItem>
                                        {(pumpingStations || []).map((station) => (
                                            <MenuItem key={station.id} value={station.id}>{station.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Box>
                        </>
                    )}

                    <TextField
                        fullWidth label="Mật khẩu" required={!isEdit} size="small"
                        type="password"
                        value={formData.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        placeholder={isEdit ? 'Để trống nếu không đổi' : ''}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                    />

                    <FormControlLabel
                        control={
                            <Switch
                                checked={formData.active}
                                onChange={(e) => handleChange('active', e.target.checked)}
                                color="primary"
                            />
                        }
                        label="Kích hoạt tài khoản"
                    />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} color="inherit">Hủy</Button>
                <Button variant="contained" onClick={handleSave} color="primary">
                    {isEdit ? 'Cập nhật' : 'Thêm mới'}
                </Button>
            </DialogActions>

            <SelectionDialog
                open={pointSelectionOpen}
                onClose={() => setPointSelectionOpen(false)}
                title="Chọn điểm ngập"
                items={points}
                labelField="name"
                initialSelectedIds={formData.assigned_inundation_point_ids}
                onConfirm={(newIds) => handleChange('assigned_inundation_point_ids', newIds)}
                singleSelect={true}
            />

            <SelectionDialog
                open={constructionSelectionOpen}
                onClose={() => setConstructionSelectionOpen(false)}
                title="Chọn công trình khẩn cấp"
                items={constructions}
                labelField="name"
                initialSelectedIds={formData.assigned_emergency_construction_ids}
                onConfirm={(newIds) => handleChange('assigned_emergency_construction_ids', newIds)}
                singleSelect={true}
            />
        </Dialog>
    );
};

export default EmployeeDialog;
