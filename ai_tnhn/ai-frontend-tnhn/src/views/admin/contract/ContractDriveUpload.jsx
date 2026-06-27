import { Box, Typography, Button, Stack, IconButton, CircularProgress } from '@mui/material';
import { IconBrandGoogleDrive, IconExternalLink, IconTrash, IconUpload } from '@tabler/icons-react';
import contractApi from 'api/contract';
import { toast } from 'react-hot-toast';
import dayjs from 'dayjs';

const formatSaveData = (vals) => {
    return {
        ...vals,
        stages: vals.stages ? vals.stages.map(s => ({
            ...s,
            date: s.date ? dayjs(s.date).toISOString() : null
        })) : [],
        start_date: vals.start_date ? dayjs(vals.start_date).toISOString() : null,
        end_date: vals.end_date ? dayjs(vals.end_date).toISOString() : null,
    };
};

const getFileUrl = (file) => {
    if (!file) return '#';
    let link = file.link;
    if (!link) {
        if (file.id && file.id.startsWith('local:')) {
            link = '/api/storage/file/' + file.id.substring(6);
        } else {
            return `https://drive.google.com/open?id=${file.id}`;
        }
    }
    if (link.startsWith('/') || link.startsWith('local:')) {
        const relativeLink = link.startsWith('local:') ? '/api/storage/file/' + link.substring(6) : link;
        const apiBase = import.meta.env?.VITE_APP_API_URL || '';
        return `${apiBase}${relativeLink}`;
    }
    return link;
};

const ContractDriveUpload = ({ values, setValues, uploading, setUploading }) => {
    return (
        <Box sx={{ p: 2, border: '1px dashed', borderColor: values.category_id ? 'secondary.main' : 'grey.400', borderRadius: '12px', bgcolor: values.category_id ? 'secondary.light' : 'grey.50', opacity: 0.9 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, color: values.category_id ? 'inherit' : 'text.disabled' }}>
                <IconBrandGoogleDrive size={20} /> Tài liệu Google Drive
            </Typography>
            
            {!values.category_id && (
                <Typography variant="caption" color="error" sx={{ mb: 1, display: 'block' }}>
                    * Vui lòng chọn danh mục để tải tài liệu
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
                                    href={getFileUrl(file)}
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
                                            await contractApi.deleteFile(file.id);
                                            toast.success('Đã xoá tệp');
                                            const updatedFiles = values.files.filter((_, i) => i !== idx);
                                            setValues(prev => ({
                                                ...prev,
                                                files: updatedFiles
                                            }));
                                            
                                            // Auto-save if in edit mode
                                            if (values.id) {
                                                const updatedValues = {
                                                    ...values,
                                                    files: updatedFiles
                                                };
                                                await contractApi.update(values.id, formatSaveData(updatedValues));
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
                        multiple
                        disabled={!values.category_id || uploading}
                        onChange={async (e) => {
                            const files = Array.from(e.target.files);
                            if (!files.length) return;
                            
                            setUploading(true);
                            try {
                                let currentFolderId = values.drive_folder_id;
                                let currentFolderLink = values.drive_folder_link;

                                // Prepare folder if not exists
                                if (!currentFolderId) {
                                    const prepRes = await contractApi.prepareFolder({
                                        category_id: values.category_id
                                    });
                                    if (prepRes && prepRes.drive_folder_id) {
                                        currentFolderId = prepRes.drive_folder_id;
                                        currentFolderLink = prepRes.drive_folder_link;
                                        setValues(prev => ({
                                            ...prev,
                                            drive_folder_id: currentFolderId,
                                            drive_folder_link: currentFolderLink
                                        }));
                                    }
                                }

                                if (!currentFolderId) throw new Error("Không thể khởi tạo thư mục Drive");

                                const newUploadedFiles = [];
                                for (const file of files) {
                                    const formData = new FormData();
                                    formData.append('file', file);
                                    
                                    const res = await contractApi.uploadToFolder(currentFolderId, formData);
                                    if (res && res.file_id) {
                                        newUploadedFiles.push({
                                            id: res.file_id,
                                            name: res.name,
                                            link: res.link
                                        });
                                    }
                                }
                                
                                if (newUploadedFiles.length > 0) {
                                    toast.success(`Đã tải lên ${newUploadedFiles.length} tệp thành công`);
                                    const updatedFiles = [...(values.files || []), ...newUploadedFiles];
                                    setValues(prev => ({
                                        ...prev,
                                        files: updatedFiles
                                    }));
                                    
                                    // Auto-save if in edit mode
                                    if (values.id) {
                                        const updatedValues = {
                                            ...values,
                                            files: updatedFiles,
                                            drive_folder_id: currentFolderId,
                                            drive_folder_link: currentFolderLink
                                        };
                                        await contractApi.update(values.id, formatSaveData(updatedValues));
                                    }
                                }
                            } catch (err) {
                                console.error(err);
                                toast.error(err.message || 'Lỗi khi tải lên tệp');
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
                            {uploading ? 'Đang tải lên...' : 'Tải tài liệu lên'}
                        </Button>
                    </label>
                </Box>
            </Stack>
        </Box>
    );
};

export default ContractDriveUpload;
