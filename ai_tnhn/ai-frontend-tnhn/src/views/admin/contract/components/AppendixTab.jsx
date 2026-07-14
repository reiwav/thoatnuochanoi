import { Box, Typography, Button, Stack, TextField, IconButton, Grid, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { IconPlus, IconTrash, IconExternalLink, IconUpload } from '@tabler/icons-react';
import { getFileUrl } from '../utils';

const AppendixTab = ({
    activeStage,
    activeStageIdx,
    values,
    setValues,
    uploading,
    handleAppendixFileUpload,
    handleRemoveAppendixFile
}) => {
    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'warning.dark', fontSize: '0.85rem' }}>
                    Phụ lục của giai đoạn ({activeStage.appendices?.length || 0})
                </Typography>
                <Button 
                    size="small" 
                    variant="outlined"
                    color="warning"
                    startIcon={<IconPlus size={12} />} 
                    onClick={() => {
                        const stagesList = [...values.stages];
                        stagesList[activeStageIdx].appendices = [...(stagesList[activeStageIdx].appendices || []), { id: `app_${Date.now()}`, appendix_number: '', name: '', content: '', year: new Date().getFullYear(), files: [], created_at: new Date().toISOString() }];
                        setValues({ ...values, stages: stagesList });
                    }}
                    sx={{ borderRadius: '6px', textTransform: 'none', fontWeight: 600, py: 0.25 }}
                >
                    Thêm phụ lục
                </Button>
            </Box>
            <Stack spacing={1.5}>
                {(activeStage.appendices || []).map((app, appIdx) => (
                    <Box 
                        key={app.id || appIdx} 
                        sx={{ 
                            p: 1.5, 
                            border: '1px solid #e2e8f0', 
                            borderRadius: '8px', 
                            bgcolor: '#f8fafc',
                            transition: 'transform 0.15s',
                            '&:hover': { transform: 'translateY(-1px)' }
                        }}
                    >
                        <Stack spacing={1.5}>
                            {/* Inline Grid for Appendix fields */}
                            <Grid container spacing={1.5} alignItems="center">
                                <Grid item xs={12} md={3}>
                                    <TextField
                                        size="small"
                                        label="Số phụ lục"
                                        fullWidth
                                        value={app.appendix_number || ''}
                                        onChange={(e) => {
                                            const stagesList = [...values.stages];
                                            stagesList[activeStageIdx].appendices[appIdx].appendix_number = e.target.value;
                                            setValues({ ...values, stages: stagesList });
                                        }}
                                        sx={{ bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={5.5}>
                                    <TextField
                                        size="small"
                                        label="Tên phụ lục"
                                        fullWidth
                                        value={app.name || ''}
                                        onChange={(e) => {
                                            const stagesList = [...values.stages];
                                            stagesList[activeStageIdx].appendices[appIdx].name = e.target.value;
                                            setValues({ ...values, stages: stagesList });
                                        }}
                                        sx={{ bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
                                    />
                                </Grid>
                                <Grid item xs={10} md={2.5}>
                                    <FormControl fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px', bgcolor: 'white' } }}>
                                        <InputLabel>Trạng thái</InputLabel>
                                        <Select
                                            value={app.status || 'Đã ký'}
                                            label="Trạng thái"
                                            onChange={(e) => {
                                                const stagesList = [...values.stages];
                                                stagesList[activeStageIdx].appendices[appIdx].status = e.target.value;
                                                setValues({ ...values, stages: stagesList });
                                            }}
                                        >
                                            <MenuItem value="Chưa ký">Chưa ký</MenuItem>
                                            <MenuItem value="Đã ký">Đã ký</MenuItem>
                                            <MenuItem value="Hết hiệu lực">Hết hiệu lực</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={2} md={1} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <IconButton 
                                        size="small" 
                                        color="error" 
                                        onClick={() => {
                                            const stagesList = [...values.stages];
                                            stagesList[activeStageIdx].appendices = stagesList[activeStageIdx].appendices.filter((_, i) => i !== appIdx);
                                            setValues({ ...values, stages: stagesList });
                                        }}
                                        sx={{ bgcolor: '#fee2e2', p: 0.5 }}
                                    >
                                        <IconTrash size={14} />
                                    </IconButton>
                                </Grid>
                            </Grid>

                            <TextField
                                size="small"
                                label="Nội dung phụ lục"
                                fullWidth
                                multiline
                                rows={1.5}
                                value={app.content || ''}
                                onChange={(e) => {
                                    const stagesList = [...values.stages];
                                    stagesList[activeStageIdx].appendices[appIdx].content = e.target.value;
                                    setValues({ ...values, stages: stagesList });
                                }}
                                sx={{ bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
                            />
                            <Box>
                                <Stack spacing={1} sx={{ mb: 1 }}>
                                    {app.files?.map((file, fileIdx) => (
                                        <Box key={fileIdx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Button variant="outlined" size="small" startIcon={<IconExternalLink size={12} />} href={getFileUrl(file)} target="_blank" sx={{ flex: 1, textTransform: 'none', justifyContent: 'flex-start', py: 0.25, bgcolor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '6px' }}>
                                                <Typography variant="caption" noWrap sx={{ maxWidth: '85%', fontSize: '0.75rem' }}>{file.name}</Typography>
                                            </Button>
                                            <IconButton size="small" color="error" onClick={() => handleRemoveAppendixFile(activeStageIdx, appIdx, fileIdx)} sx={{ p: 0.5 }}>
                                                <IconTrash size={12} />
                                            </IconButton>
                                        </Box>
                                    ))}
                                </Stack>
                                <Box>
                                    <input 
                                        type="file" 
                                        id={`upload-app-${activeStageIdx}-${appIdx}`} 
                                        style={{ display: 'none' }} 
                                        multiple 
                                        disabled={uploading || !values.category_id}
                                        onChange={(e) => handleAppendixFileUpload(e, activeStageIdx, appIdx)} 
                                    />
                                    <label htmlFor={`upload-app-${activeStageIdx}-${appIdx}`}>
                                        <Button 
                                            variant="outlined" 
                                            size="small" 
                                            component="span" 
                                            disabled={uploading || !values.category_id} 
                                            startIcon={<IconUpload size={12} />}
                                            sx={{ 
                                                borderStyle: 'dashed', 
                                                borderWidth: '1px',
                                                borderRadius: '6px',
                                                textTransform: 'none',
                                                borderColor: '#cbd5e1',
                                                py: 0.25,
                                                fontSize: '0.75rem',
                                                '&:hover': { borderStyle: 'dashed', borderWidth: '1px' }
                                            }}
                                        >
                                            Tải lên tài liệu phụ lục
                                        </Button>
                                    </label>
                                    {!values.category_id && (
                                        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                                            * Chọn danh mục hợp đồng ở Tab 0 để tải tài liệu
                                        </Typography>
                                    )}
                                </Box>
                            </Box>
                        </Stack>
                    </Box>
                ))}
            </Stack>
        </Box>
    );
};

export default AppendixTab;
