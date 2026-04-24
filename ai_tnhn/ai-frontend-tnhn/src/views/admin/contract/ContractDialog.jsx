import { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Box, Typography, IconButton, 
    Stack, Divider, InputAdornment, FormControl, InputLabel, Select, MenuItem, CircularProgress
} from '@mui/material';
import { IconPlus, IconTrash, IconCash, IconBrandGoogleDrive, IconUpload, IconExternalLink } from '@tabler/icons-react';
import contractApi from 'api/contract';
import contractCategoryApi from 'api/contractCategory';
import { toast } from 'react-hot-toast';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

const ContractDialog = ({ open, onClose, onSubmit, contract, isEdit }) => {
    const [values, setValues] = useState({
        name: '',
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
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        if (open) {
            loadCategories();
            if (isEdit && contract) {
                setValues(prev => ({
                    ...prev,
                    name: contract.name || '',
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
                    // Only overwrite files if they are not already set or if explicitly provided with content
                    files: (contract.files && contract.files.length > 0) ? contract.files : prev.files
                }));
            } else {
                setValues({
                    name: '',
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
    }, [open, isEdit, contract]);
    // Note: We removed the direct 'contract' dependency to avoid frequent resets, 
    // but React lint might complain. Using functional update to preserve state.

    const loadCategories = async () => {
        try {
            const res = await contractCategoryApi.getTree();
            if (res.data?.status === 'success') {
                setCategories(res.data.data || []);
            }
        } catch (err) {
            console.error('Failed to load categories');
        }
    };

    const refreshFiles = async () => {
        if (!isEdit || !contract?.id) return;
        try {
            const res = await contractApi.getById(contract.id);
            if (res.data?.status === 'success') {
                const refreshedFiles = res.data.data.files || [];
                setValues(prev => ({
                    ...prev,
                    files: refreshedFiles
                }));
            }
        } catch (err) {
            console.error('Failed to refresh files', err);
        }
    };

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

    const handleSave = () => {
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
        onSubmit(data);
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Dialog 
                open={open} 
                onClose={onClose} 
                maxWidth="sm" 
                fullWidth
                slotProps={{ paper: { sx: { borderRadius: '16px' } } }}
            >
                <DialogTitle sx={{ p: 3, pb: 2 }}>
                    <Typography variant="h3" component="div" sx={{ fontWeight: 700 }}>
                        {isEdit ? 'Chỉnh sửa hợp đồng' : 'Thêm hợp đồng mới'}
                    </Typography>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 4 }}>
                    <Stack spacing={3}>
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

                        <Stack direction="row" spacing={2}>
                            <DatePicker
                                label="Ngày bắt đầu"
                                value={values.start_date}
                                onChange={(val) => setValues({ ...values, start_date: val })}
                                slotProps={{ textField: { fullWidth: true, sx: { '& .MuiOutlinedInput-root': { borderRadius: '12px' } } } }}
                            />
                            <DatePicker
                                label="Ngày hết hạn"
                                value={values.end_date}
                                onChange={(val) => setValues({ ...values, end_date: val })}
                                slotProps={{ textField: { fullWidth: true, sx: { '& .MuiOutlinedInput-root': { borderRadius: '12px' } } } }}
                            />
                        </Stack>

                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Các giai đoạn hợp đồng</Typography>
                                <Button 
                                    size="small" 
                                    startIcon={<IconPlus size={16} />} 
                                    onClick={addStage}
                                    variant="outlined"
                                    color="secondary"
                                    sx={{ borderRadius: '8px' }}
                                >
                                    Thêm giai đoạn
                                </Button>
                            </Box>
                            <Stack spacing={2}>
                                {values.stages.map((stage, index) => (
                                    <Box key={index} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: '12px', bgcolor: 'grey.50' }}>
                                        <Stack spacing={2}>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <TextField
                                                    size="small"
                                                    fullWidth
                                                    placeholder="Tên giai đoạn (ví dụ: Giai đoạn 1)"
                                                    value={stage.name}
                                                    onChange={(e) => handleStageChange(index, 'name', e.target.value)}
                                                    sx={{ bgcolor: 'white' }}
                                                />
                                                <IconButton size="small" color="error" onClick={() => removeStage(index)} disabled={values.stages.length === 1}>
                                                    <IconTrash size={18} />
                                                </IconButton>
                                            </Stack>
                                            <Stack direction="row" spacing={2}>
                                                <TextField
                                                    size="small"
                                                    fullWidth
                                                    type="number"
                                                    label="Giá tiền"
                                                    placeholder="0"
                                                    value={stage.amount}
                                                    onChange={(e) => handleStageChange(index, 'amount', e.target.value)}
                                                    slotProps={{
                                                        input: {
                                                            startAdornment: <InputAdornment position="start"><IconCash size={16} /></InputAdornment>,
                                                            endAdornment: <InputAdornment position="end">VNĐ</InputAdornment>
                                                        }
                                                    }}
                                                    sx={{ bgcolor: 'white' }}
                                                />
                                                <DatePicker
                                                    label="Ngày dự kiến"
                                                    value={stage.date}
                                                    onChange={(val) => handleStageChange(index, 'date', val)}
                                                    slotProps={{ textField: { fullWidth: true, size: 'small', sx: { bgcolor: 'white' } } }}
                                                />
                                            </Stack>
                                        </Stack>
                                    </Box>
                                ))}
                            </Stack>
                        </Box>

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

                        <Box sx={{ p: 2, border: '1px dashed', borderColor: values.category_id ? 'secondary.main' : 'grey.400', borderRadius: '12px', bgcolor: values.category_id ? 'secondary.light' : 'grey.50', opacity: 0.9 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, color: values.category_id ? 'inherit' : 'text.disabled' }}>
                                <IconBrandGoogleDrive size={20} /> Tài liệu Google Drive
                            </Typography>
                            
                            {!values.category_id && (
                                <Typography variant="caption" color="error" sx={{ mb: 1, display: 'block' }}>
                                    * Vui lòng chọn danh mục để tải tài liệu lên Drive
                                </Typography>
                            )}

                            <Stack spacing={1.5}>
                                {values.files && values.files.length > 0 && (
                                    <Box sx={{ mt: 1 }}>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1, display: 'block' }}>
                                            DANH SÁCH TỆP ĐÃ TẢI LÊN:
                                        </Typography>
                                        {values.files.map((file, idx) => (
                                            <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 0.5 }}>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    startIcon={<IconExternalLink size={16} />}
                                                    href={file.link || `https://drive.google.com/open?id=${file.id}`}
                                                    target="_blank"
                                                    sx={{ 
                                                        flex: 1,
                                                        justifyContent: 'flex-start', 
                                                        textTransform: 'none',
                                                        borderRadius: '8px',
                                                        borderColor: 'divider',
                                                        bgcolor: 'white',
                                                        color: 'text.primary',
                                                        '&:hover': { bgcolor: 'grey.100', borderColor: 'primary.main' }
                                                    }}
                                                >
                                                    <Typography variant="body2" noWrap sx={{ maxWidth: '85%', fontWeight: 500 }}>
                                                        {file.name}
                                                    </Typography>
                                                </Button>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={async () => {
                                                        if (!window.confirm(`Xoá tệp "${file.name}"?`)) return;
                                                        try {
                                                            const res = await contractApi.deleteFile(file.id);
                                                            if (res.data?.status === 'success') {
                                                                toast.success('Đã xoá tệp');
                                                                setValues(prev => ({
                                                                    ...prev,
                                                                    files: prev.files.filter((_, i) => i !== idx)
                                                                }));
                                                            }
                                                        } catch (err) {
                                                            toast.error('Lỗi khi xoá tệp');
                                                        }
                                                    }}
                                                >
                                                    <IconTrash size={16} />
                                                </IconButton>
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                                
                                <Box>
                                    <input
                                        type="file"
                                        id="contract-file-upload"
                                        style={{ display: 'none' }}
                                        disabled={!values.category_id || uploading}
                                        onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;
                                            
                                            setUploading(true);
                                            try {
                                                let currentFolderId = values.drive_folder_id;
                                                let currentFolderLink = values.drive_folder_link;

                                                // Prepare folder if not exists
                                                if (!currentFolderId) {
                                                    const prepRes = await contractApi.prepareFolder({
                                                        category_id: values.category_id
                                                    });
                                                    if (prepRes.data?.status === 'success') {
                                                        currentFolderId = prepRes.data.data.drive_folder_id;
                                                        currentFolderLink = prepRes.data.data.drive_folder_link;
                                                        setValues(prev => ({
                                                            ...prev,
                                                            drive_folder_id: currentFolderId,
                                                            drive_folder_link: currentFolderLink
                                                        }));
                                                    }
                                                }

                                                if (!currentFolderId) throw new Error("Không thể khởi tạo thư mục Drive");

                                                const formData = new FormData();
                                                formData.append('file', file);
                                                
                                                const res = await contractApi.uploadToFolder(currentFolderId, formData);
                                                if (res.data?.status === 'success') {
                                                    toast.success('Tải lên thành công');
                                                    const newFile = {
                                                        id: res.data.data.file_id,
                                                        name: res.data.data.name,
                                                        link: res.data.data.link
                                                    };
                                                    setValues(prev => ({
                                                        ...prev,
                                                        files: [...(prev.files || []), newFile]
                                                    }));
                                                }
                                            } catch (err) {
                                                console.error(err);
                                                toast.error(err.message || 'Lỗi khi tải lên Drive');
                                            } finally {
                                                setUploading(false);
                                                // Clear file input
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                    <label htmlFor="contract-file-upload">
                                        <Button
                                            component="span"
                                            variant="outlined"
                                            color="secondary"
                                            startIcon={uploading ? <CircularProgress size={18} /> : <IconUpload size={18} />}
                                            disabled={!values.category_id || uploading}
                                            fullWidth
                                            sx={{ borderRadius: '8px', bgcolor: 'white' }}
                                        >
                                            {uploading ? 'Đang tải lên...' : 'Tải tài liệu lên Drive'}
                                        </Button>
                                    </label>
                                </Box>
                            </Stack>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1 }}>
                    <Button onClick={onClose} color="inherit">Hủy bỏ</Button>
                    <Button 
                        onClick={handleSave} 
                        variant="contained" 
                        color="secondary"
                        disabled={!values.name}
                        sx={{ borderRadius: '10px', px: 4, fontWeight: 700 }}
                    >
                        {isEdit ? 'Cập nhật' : 'Thêm mới'}
                    </Button>
                </DialogActions>
            </Dialog>
        </LocalizationProvider>
    );
};

export default ContractDialog;
