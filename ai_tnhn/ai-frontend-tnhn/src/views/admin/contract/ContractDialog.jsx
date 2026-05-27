import { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Box, Typography, IconButton, 
    Stack, Divider, InputAdornment, FormControl, InputLabel, Select, MenuItem, CircularProgress, Grid
} from '@mui/material';
import { IconPlus, IconTrash, IconCash, IconBrandGoogleDrive, IconUpload, IconExternalLink } from '@tabler/icons-react';
import contractApi from 'api/contract';
import contractCategoryApi from 'api/contractCategory';
import { toast } from 'react-hot-toast';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import ContractStages from './ContractStages';
import ContractDriveUpload from './ContractDriveUpload';

const ContractDialog = ({ open, onClose, onSubmit, contract, isEdit, parentContract }) => {
    const [values, setValues] = useState({
        name: '',
        contract_number: '',
        investor_name: '',
        jv_members: '',
        parent_id: '',
        category_id: '',
        start_date: null,
        end_date: null,
        stages: [{ name: '', amount: 0, date: null }],
        note: '',
        drive_folder_id: '',
        drive_folder_link: '',
        files: []
    });
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        if (open) {
            loadCategories();
            if (isEdit && contract) {
                setValues({
                    name: contract.name || '',
                    contract_number: contract.contract_number || '',
                    investor_name: contract.investor_name || '',
                    jv_members: contract.jv_members || '',
                    parent_id: contract.parent_id || '',
                    category_id: contract.category_id || '',
                    start_date: contract.start_date ? dayjs(contract.start_date) : null,
                    end_date: contract.end_date ? dayjs(contract.end_date) : null,
                    stages: contract.stages ? contract.stages.map(s => ({
                        ...s,
                        date: s.date ? dayjs(s.date) : null
                    })) : [{ name: '', amount: 0, date: null }],
                    note: contract.note || '',
                    drive_folder_id: contract.drive_folder_id || '',
                    drive_folder_link: contract.drive_folder_link || '',
                    files: contract.files || []
                });
            } else if (parentContract) {
                setValues({
                    name: '',
                    contract_number: '',
                    investor_name: parentContract.investor_name || '',
                    jv_members: parentContract.jv_members || '',
                    parent_id: parentContract.id || '',
                    category_id: parentContract.category_id || '',
                    start_date: null,
                    end_date: null,
                    stages: [{ name: '', amount: 0, date: null }],
                    note: '',
                    drive_folder_id: '',
                    drive_folder_link: '',
                    files: []
                });
            } else {
                setValues({
                    name: '',
                    contract_number: '',
                    investor_name: '',
                    jv_members: '',
                    parent_id: '',
                    category_id: '',
                    start_date: null,
                    end_date: null,
                    stages: [{ name: '', amount: 0, date: null }],
                    note: '',
                    drive_folder_id: '',
                    drive_folder_link: '',
                    files: []
                });
            }
        }
    }, [open, isEdit, contract, parentContract]);
    // Note: We removed the direct 'contract' dependency to avoid frequent resets, 
    // but React lint might complain. Using functional update to preserve state.

    const loadCategories = async () => {
        try {
            const res = await contractCategoryApi.getTree();
            console.log("loadCategories res:", res);
            if (Array.isArray(res)) {
                setCategories(res);
            } else if (res && res.data) {
                setCategories(res.data || []);
            }
        } catch (err) {
            console.error('Failed to load categories', err);
        }
    };

    const refreshFiles = async () => {
        if (!isEdit || !contract?.id) return;
        try {
            const res = await contractApi.getById(contract.id);
            if (res && res.id) {
                const refreshedFiles = res.files || [];
                setValues(prev => ({
                    ...prev,
                    files: refreshedFiles
                }));
            }
        } catch (err) {
            console.error('Failed to refresh files', err);
        }
    };

    // Automatically poll and refresh files list if there are any local files waiting to be synced to Drive
    useEffect(() => {
        let intervalId = null;
        
        const hasLocalFiles = values.files && values.files.some(file => 
            (file.id && file.id.startsWith('local:')) || 
            (file.link && (file.link.startsWith('/') || file.link.startsWith('local:')))
        );
        
        if (open && isEdit && contract?.id && hasLocalFiles) {
            intervalId = setInterval(() => {
                refreshFiles();
            }, 3000);
        }
        
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [open, isEdit, contract?.id, values.files]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setValues({ ...values, [name]: value });
    };

    const handleStageChange = (index, field, value) => {
        const newStages = [...values.stages];
        newStages[index][field] = field === 'amount' ? parseFloat(value) || 0 : value;
        setValues({ ...values, stages: newStages });
    };

    const addStage = () => {
        setValues({
            ...values,
            stages: [...values.stages, { name: '', amount: 0, date: null }]
        });
    };

    const removeStage = (index) => {
        const newStages = values.stages.filter((_, i) => i !== index);
        setValues({ ...values, stages: newStages });
    };

    const handleSave = async () => {
        if (!values.name) return;

        // Validate stage constraints
        if (values.start_date && values.end_date) {
            for (let i = 0; i < values.stages.length; i++) {
                const stage = values.stages[i];
                if (stage.date) {
                    const stDate = dayjs(stage.date);
                    if (stDate.isBefore(values.start_date, 'day') || stDate.isAfter(values.end_date, 'day')) {
                        toast.error(`Ngày của giai đoạn "${stage.name || `Giai đoạn ${i + 1}`}" phải nằm trong thời gian hợp đồng (${values.start_date.format('DD/MM/YYYY')} - ${values.end_date.format('DD/MM/YYYY')}).`);
                        return; // Stop explicitly on error
                    }
                }
            }
        }

        const data = {
            ...values,
            stages: values.stages.map(s => ({
                ...s,
                date: s.date ? dayjs(s.date).toISOString() : null
            })),
            start_date: values.start_date ? values.start_date.toISOString() : null,
            end_date: values.end_date ? values.end_date.toISOString() : null,
        };
        
        setSubmitting(true);
        try {
            await onSubmit(data);
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Dialog 
                open={open} 
                onClose={(event, reason) => {
                    if (reason === 'backdropClick') return;
                    onClose();
                }}
                maxWidth="lg" 
                fullWidth
                slotProps={{ paper: { sx: { borderRadius: '16px' } } }}
            >
                <DialogTitle sx={{ p: 3, pb: 2 }}>
                    <Typography variant="h3" component="div" sx={{ fontWeight: 700 }}>
                        {values.parent_id ? (isEdit ? 'Chỉnh sửa phụ lục hợp đồng' : 'Thêm phụ lục hợp đồng mới') : (isEdit ? 'Chỉnh sửa hợp đồng' : 'Thêm hợp đồng mới')}
                    </Typography>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 4 }}>
                    <Grid container spacing={4}>
                        {/* Left Column: General Info & Upload */}
                        <Grid item xs={12} md={6}>
                            <Stack spacing={3}>
                                <TextField
                                    fullWidth
                                    label="Số hợp đồng / Phụ lục"
                                    name="contract_number"
                                    value={values.contract_number}
                                    onChange={handleChange}
                                    required
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                                />

                                <TextField
                                    fullWidth
                                    label="Tên hợp đồng"
                                    name="name"
                                    value={values.name}
                                    onChange={handleChange}
                                    required
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                                />

                                <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
                                    <InputLabel>Danh mục</InputLabel>
                                    <Select
                                        name="category_id"
                                        value={values.category_id}
                                        onChange={handleChange}
                                        label="Danh mục"
                                        disabled={!!values.parent_id}
                                    >
                                        {categories.map((c) => (
                                            <MenuItem key={c.id} value={c.id}>
                                                {'\u00A0'.repeat(c.level * 4)}
                                                {c.level > 0 ? '└── ' : ''}
                                                {c.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <TextField
                                    fullWidth
                                    label="Tên chủ đầu tư"
                                    name="investor_name"
                                    value={values.investor_name}
                                    onChange={handleChange}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                                />

                                <TextField
                                    fullWidth
                                    label="Thành viên liên danh (nếu có)"
                                    name="jv_members"
                                    value={values.jv_members}
                                    onChange={handleChange}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                                />

                                <Stack direction="row" spacing={2}>
                                    <DatePicker
                                        label="Ngày bắt đầu"
                                        value={values.start_date}
                                        onChange={(val) => setValues({ ...values, start_date: val })}
                                        format="DD/MM/YYYY"
                                        slotProps={{ textField: { fullWidth: true, sx: { '& .MuiOutlinedInput-root': { borderRadius: '12px' } } } }}
                                    />
                                    <DatePicker
                                        label="Ngày hết hạn"
                                        value={values.end_date}
                                        onChange={(val) => setValues({ ...values, end_date: val })}
                                        format="DD/MM/YYYY"
                                        slotProps={{ textField: { fullWidth: true, sx: { '& .MuiOutlinedInput-root': { borderRadius: '12px' } } } }}
                                    />
                                </Stack>

                                <TextField
                                    fullWidth
                                    label="Ghi chú"
                                    name="note"
                                    multiline
                                    rows={3}
                                    value={values.note}
                                    onChange={handleChange}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                                />

                                <ContractDriveUpload 
                                    values={values} 
                                    setValues={setValues} 
                                    uploading={uploading} 
                                    setUploading={setUploading} 
                                />
                            </Stack>
                        </Grid>

                        {/* Right Column: Stages */}
                        <Grid item xs={12} md={6}>
                            <ContractStages 
                                stages={values.stages}
                                handleStageChange={handleStageChange}
                                addStage={addStage}
                                removeStage={removeStage}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1 }}>
                    <Button onClick={onClose} color="inherit" disabled={submitting || uploading}>Hủy bỏ</Button>
                    <Button 
                        onClick={handleSave} 
                        variant="contained" 
                        color="secondary"
                        disabled={!values.name || submitting || uploading}
                        startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
                        sx={{ borderRadius: '10px', px: 4, fontWeight: 700 }}
                    >
                        {submitting ? 'Đang lưu...' : (isEdit ? 'Cập nhật' : 'Thêm mới')}
                    </Button>
                </DialogActions>
            </Dialog>
        </LocalizationProvider>
    );
};

export default ContractDialog;
