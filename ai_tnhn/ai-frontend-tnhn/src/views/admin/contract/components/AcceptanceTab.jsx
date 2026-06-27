import { Box, Typography, Button, Stack, TextField, IconButton, Grid, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { IconPlus, IconTrash, IconFileText, IconUpload } from '@tabler/icons-react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

const AcceptanceTab = ({
    activeStage,
    activeStageIdx,
    values,
    setValues,
    uploading,
    handleRecordFileUpload,
    handleRemoveRecordFile
}) => {
    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.85rem' }}>
                    Nghiệm thu (BBNT) ({activeStage.acceptance_records?.length || 0})
                </Typography>
                <Button 
                    size="small" 
                    variant="outlined"
                    color="primary"
                    startIcon={<IconPlus size={12} />} 
                    onClick={() => {
                        const stagesList = [...values.stages];
                        stagesList[activeStageIdx].acceptance_records = [...(stagesList[activeStageIdx].acceptance_records || []), { id: `acc_${Date.now()}`, title: '', date: dayjs().format('YYYY-MM-DD'), content: '', scan_files: [], created_at: new Date().toISOString() }];
                        setValues({ ...values, stages: stagesList });
                    }}
                    sx={{ borderRadius: '6px', textTransform: 'none', fontWeight: 600, py: 0.25 }}
                >
                    Thêm nghiệm thu
                </Button>
            </Box>
            <Stack spacing={1.5}>
                {(activeStage.acceptance_records || []).map((record, recIdx) => (
                    <Box 
                        key={record.id || recIdx} 
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
                            {/* Inline Grid for BBNT fields */}
                            <Grid container spacing={1.5} alignItems="center">
                                <Grid item xs={12} md={4.5}>
                                    <TextField
                                        size="small"
                                        label="Tiêu đề nghiệm thu"
                                        fullWidth
                                        value={record.title || ''}
                                        onChange={(e) => {
                                            const stagesList = [...values.stages];
                                            stagesList[activeStageIdx].acceptance_records[recIdx].title = e.target.value;
                                            setValues({ ...values, stages: stagesList });
                                        }}
                                        sx={{ bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={3.5}>
                                    <DatePicker
                                        label="Ngày nghiệm thu"
                                        value={record.date ? dayjs(record.date) : null}
                                        onChange={(val) => {
                                            const stagesList = [...values.stages];
                                            stagesList[activeStageIdx].acceptance_records[recIdx].date = val ? val.format('YYYY-MM-DD') : '';
                                            setValues({ ...values, stages: stagesList });
                                        }}
                                        format="DD/MM/YYYY"
                                        slotProps={{ 
                                            textField: { 
                                                fullWidth: true, 
                                                size: 'small', 
                                                sx: { '& .MuiOutlinedInput-root': { borderRadius: '6px', bgcolor: 'white' } } 
                                            } 
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={10} md={3}>
                                    <FormControl fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px', bgcolor: 'white' } }}>
                                        <InputLabel>Trạng thái</InputLabel>
                                        <Select
                                            value={record.status || 'Đã ký'}
                                            label="Trạng thái"
                                            onChange={(e) => {
                                                const stagesList = [...values.stages];
                                                stagesList[activeStageIdx].acceptance_records[recIdx].status = e.target.value;
                                                setValues({ ...values, stages: stagesList });
                                            }}
                                        >
                                            <MenuItem value="Chưa ký">Chưa ký</MenuItem>
                                            <MenuItem value="Đã ký">Đã ký</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={2} md={1} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <IconButton 
                                        size="small" 
                                        color="error" 
                                        onClick={() => {
                                            const stagesList = [...values.stages];
                                            stagesList[activeStageIdx].acceptance_records = stagesList[activeStageIdx].acceptance_records.filter((_, i) => i !== recIdx);
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
                                label="Nội dung nghiệm thu"
                                fullWidth
                                multiline
                                rows={1.5}
                                value={record.content || ''}
                                onChange={(e) => {
                                    const stagesList = [...values.stages];
                                    stagesList[activeStageIdx].acceptance_records[recIdx].content = e.target.value;
                                    setValues({ ...values, stages: stagesList });
                                }}
                                sx={{ bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
                            />

                            <Box>
                                <Stack spacing={1} sx={{ mb: 1 }}>
                                    {record.scan_files?.map((link, fileIdx) => (
                                        <Box key={fileIdx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Button variant="outlined" size="small" startIcon={<IconFileText size={12} />} href={link.startsWith('http') ? link : (import.meta.env?.VITE_APP_API_URL || '') + (link.startsWith('local:') ? '/api/storage/file/' + link.substring(6) : link)} target="_blank" sx={{ flex: 1, textTransform: 'none', justifyContent: 'flex-start', py: 0.25, bgcolor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '6px' }}>
                                                <Typography variant="caption" noWrap sx={{ fontSize: '0.75rem' }}>Bản scan #{(fileIdx + 1)}</Typography>
                                            </Button>
                                            <IconButton size="small" color="error" onClick={() => handleRemoveRecordFile(activeStageIdx, 'acceptance', recIdx, fileIdx)} sx={{ p: 0.5 }}>
                                                <IconTrash size={12} />
                                            </IconButton>
                                        </Box>
                                    ))}
                                </Stack>
                                <Box>
                                    <input 
                                        type="file" 
                                        id={`upload-acc-${activeStageIdx}-${recIdx}`} 
                                        style={{ display: 'none' }} 
                                        multiple 
                                        disabled={uploading || !values.category_id}
                                        onChange={(e) => handleRecordFileUpload(e, activeStageIdx, 'acceptance', recIdx)} 
                                    />
                                    <label htmlFor={`upload-acc-${activeStageIdx}-${recIdx}`}>
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
                                             Tải lên bản scan nghiệm thu
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

export default AcceptanceTab;
