import React, { useState, useEffect, useMemo } from 'react';
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
import * as ROLES from 'constants/role';

const EmployeeDialog = ({ open, onClose, onSubmit, employee, isEdit, organizations = [], defaultOrgId = '', canSelectOrg }) => {
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
        role: ROLES.ROLE_CONG_NHAN_CTY,
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
                    role: employee.role || ROLES.ROLE_CONG_NHAN_CTY,
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
                    role: ROLES.ROLE_CONG_NHAN_CTY,
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
                    let rls = rolesRes.data.data || [];
                    rls = rls.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi', { sensitivity: 'base' }));
                    setRoles(rls);
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
        setFormData(prev => {
            const newData = { ...prev, [field]: value };

            // If changing organization, check if current role is still valid
            if (field === 'org_id' && value) {
                const selectedOrg = organizations.find(o => o.id === value);
                const isCompany = selectedOrg?.code?.toUpperCase() === 'TNHN';

                // Find if current role is valid for the new org type
                const selectedRole = roles.find(r => r.code === prev.role);
                const isCurrentRoleValid = selectedRole ? selectedRole.is_company === isCompany : false;

                if (!isCurrentRoleValid) {
                    // Default fallback: Find first valid role for this org type
                    const defaultRole = roles.find(r => r.is_company === isCompany);
                    newData.role = defaultRole ? defaultRole.code : (isCompany ? ROLES.ROLE_GIAM_DOC_CTY : ROLES.ROLE_CONG_NHAN_CTY);
                }
            }

            return newData;
        });
    };

    const handleSave = () => {
        if (!formData.name) return toast.error('Vui lòng nhập tên');
        if (!formData.email) return toast.error('Vui lòng nhập email');
        if (userRole !== 'admin_org' && !formData.org_id) return toast.error('Vui lòng chọn công ty');
        if (!isEdit && !formData.password) return toast.error('Vui lòng nhập mật khẩu');
        onSubmit(formData);
    };

    const filteredRoles = useMemo(() => {
        return roles.filter(r => {
            // 1. Filter by current user permission (unit management restricted to their scope)
            if (userRole === ROLES.ROLE_GIAM_DOC_XN) {
                if (![ROLES.ROLE_TRUONG_PHONG_KT, ROLES.ROLE_CONG_NHAN_CTY].includes(r.code)) return false;
            }
            if (userRole === ROLES.ROLE_TRUONG_PHONG_KT || userRole === ROLES.ROLE_PHONG_KT_CL) {
                if (![ROLES.ROLE_CONG_NHAN_CTY].includes(r.code)) return false;
            }

            // 2. Filter by selected organization type (HQ vs Unit)
            const selectedOrg = organizations.find(o => o.id === formData.org_id);
            const isCompany = selectedOrg?.code?.toUpperCase() === 'TNHN';

            // Managers can only create users in their own org (Unit)
            const isUnitManager = [ROLES.ROLE_GIAM_DOC_XN, ROLES.ROLE_TRUONG_PHONG_KT, ROLES.ROLE_PHONG_KT_CL].includes(userRole);

            if (formData.org_id) {
                // If it's a company-wide role requester (HQ), allow all company roles
                if ([ROLES.ROLE_SUPER_ADMIN, ROLES.ROLE_CHU_TICH_CTY, ROLES.ROLE_GIAM_DOC_CTY, ROLES.ROLE_PHO_GIAM_DOC_CTY, ROLES.ROLE_PHONG_HT_MT_CDS].includes(userRole)) {
                    return r.is_company === isCompany;
                }
                // For Unit managers, only show unit roles that match the organization type (is_company: false)
                return r.is_company === isCompany;
            }

            return true;
        });
    }, [roles, userRole, organizations, formData.org_id]);

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
                                {fetchingData && roles.length === 0 ? (
                                    <MenuItem value={formData.role}>
                                        <CircularProgress size={14} sx={{ mr: 1 }} /> Đang tải...
                                    </MenuItem>
                                ) : (
                                    filteredRoles.map((r) => (
                                        <MenuItem key={r.code} value={r.code}>
                                            {r.name}
                                        </MenuItem>
                                    ))
                                )}
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Org selector dropdown - Only for privileged roles */}
                    {canSelectOrg && (
                        <FormControl fullWidth size="small">
                            <InputLabel>Công ty / Xí nghiệp *</InputLabel>
                            <Select
                                value={formData.org_id}
                                label="Công ty / Xí nghiệp *"
                                onChange={(e) => handleChange('org_id', e.target.value)}
                                sx={{ borderRadius: '12px', bgcolor: '#f8fafc' }}
                            >
                                {organizations.map((org) => (
                                    <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    {([ROLES.ROLE_EMPLOYEE, ROLES.ROLE_CONG_NHAN_CTY].includes(formData.role)) && (
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
