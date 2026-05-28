import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, IconButton, Stack, FormControlLabel, Switch,
    FormControl, InputLabel, Select, MenuItem, CircularProgress, Box, Chip, Typography
} from '@mui/material';
import { IconX } from '@tabler/icons-react';
import SelectionDialog from './components/SelectionDialog';
import useEmployeeDialog from './hooks/useEmployeeDialog';

const EmployeeDialog = ({ open, onClose, onSubmit, employee, isEdit, organizations = [], defaultOrgId = '', canSelectOrg }) => {
    const {
        hasPermission,
        userRole,
        formData,
        handleChange,
        handleSave,
        points,
        constructions,
        pumpingStations,
        wastewaterStations,
        sluiceGates,
        roles,
        fetchingData,
        pointSelectionOpen,
        setPointSelectionOpen,
        constructionSelectionOpen,
        setConstructionSelectionOpen,
        isEmployeeRole
    } = useEmployeeDialog({ open, employee, isEdit, defaultOrgId, canSelectOrg });

    const filteredRoles = roles;

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
                        slotProps={{ input: { sx: { borderRadius: 3, fontWeight: 600 } } }}
                    />

                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                        <TextField
                            fullWidth label="Email" required size="small"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            sx={{ flex: 1 }}
                            slotProps={{ input: { sx: { borderRadius: 3, fontWeight: 600 } } }}
                        />
                        <FormControl fullWidth size="small" sx={{ flex: 1 }}>
                            <InputLabel>Vai trò</InputLabel>
                            <Select
                                value={formData.role}
                                label="Vai trò"
                                onChange={(e) => handleChange('role', e.target.value)}
                                sx={{ borderRadius: 3, fontWeight: 600 }}
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
                                sx={{ borderRadius: 3, fontWeight: 600 }}
                            >
                                {organizations.map((org) => (
                                    <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    {isEmployeeRole && (
                        <>
                            <Box>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>Điểm ngập được giao</Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {formData.assigned_inundation_station_ids.length > 0
                                                ? `Đã chọn ${formData.assigned_inundation_station_ids.length} điểm`
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
                                    {formData.assigned_inundation_station_ids.length === 0 ? (
                                        <Typography variant="caption" color="textSecondary" sx={{ fontStyle: 'italic' }}>Chưa có điểm nào</Typography>
                                    ) : (
                                        formData.assigned_inundation_station_ids.slice(0, 8).map((id) => {
                                            const point = points.find(p => p.id === id);
                                            return <Chip key={id} label={point ? point.name : id} size="small" sx={{ fontWeight: 600 }} />;
                                        })
                                    )}
                                    {formData.assigned_inundation_station_ids.length > 8 && (
                                        <Chip label={`+${formData.assigned_inundation_station_ids.length - 8} mục nữa`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
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
                                        sx={{ borderRadius: 3, fontWeight: 600 }}
                                    >
                                        <MenuItem value=""><em>Không gán</em></MenuItem>
                                        {(pumpingStations || []).map((station) => (
                                            <MenuItem key={station.id} value={station.id}>{station.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Box>

                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mb: 1, mt: 1 }}>Trạm XLNT được giao</Typography>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Chọn trạm XLNT</InputLabel>
                                    <Select
                                        value={formData.assigned_wastewater_station_id}
                                        label="Chọn trạm XLNT"
                                        onChange={(e) => handleChange('assigned_wastewater_station_id', e.target.value)}
                                        sx={{ borderRadius: 3, fontWeight: 600 }}
                                    >
                                        <MenuItem value=""><em>Không gán</em></MenuItem>
                                        {(wastewaterStations || []).map((station) => (
                                            <MenuItem key={station.id} value={station.id}>{station.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Box>

                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mb: 1, mt: 1 }}>Cửa phai được giao</Typography>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Chọn cửa phai</InputLabel>
                                    <Select
                                        value={formData.assigned_sluice_gate_id}
                                        label="Chọn cửa phai"
                                        onChange={(e) => handleChange('assigned_sluice_gate_id', e.target.value)}
                                        sx={{ borderRadius: 3, fontWeight: 600 }}
                                    >
                                        <MenuItem value=""><em>Không gán</em></MenuItem>
                                        {(sluiceGates || []).map((gate) => (
                                            <MenuItem key={gate.id} value={gate.id}>{gate.name}</MenuItem>
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
                        slotProps={{ input: { sx: { borderRadius: 3, fontWeight: 600 } } }}
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
                <Button onClick={onClose} color="inherit" sx={{ borderRadius: 3 }}>Hủy</Button>
                <Button variant="contained" onClick={() => handleSave(onSubmit)} color="primary" sx={{ borderRadius: 3, fontWeight: 700 }}>
                    {isEdit ? 'Cập nhật' : 'Thêm mới'}
                </Button>
            </DialogActions>

            <SelectionDialog
                open={pointSelectionOpen}
                onClose={() => setPointSelectionOpen(false)}
                title="Chọn điểm ngập"
                items={points}
                labelField="name"
                initialSelectedIds={formData.assigned_inundation_station_ids}
                onConfirm={(newIds) => handleChange('assigned_inundation_station_ids', newIds)}
                singleSelect={false}
            />

            <SelectionDialog
                open={constructionSelectionOpen}
                onClose={() => setConstructionSelectionOpen(false)}
                title="Chọn công trình khẩn cấp"
                items={constructions}
                labelField="name"
                initialSelectedIds={formData.assigned_emergency_construction_ids}
                onConfirm={(newIds) => handleChange('assigned_emergency_construction_ids', newIds)}
                singleSelect={false}
            />
        </Dialog>
    );
};

export default EmployeeDialog;
