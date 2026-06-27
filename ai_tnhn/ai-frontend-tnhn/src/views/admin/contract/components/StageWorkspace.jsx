import { Box, Typography, Stack, TextField, InputAdornment, Tabs, Tab, Grid, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { IconCash } from '@tabler/icons-react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import AppendixTab from './AppendixTab';
import AcceptanceTab from './AcceptanceTab';
import PaymentTab from './PaymentTab';

const StageWorkspace = ({
    activeStage,
    activeStageIdx,
    values,
    setValues,
    uploading,
    setUploading,
    handleStageChange,
    stageTabs,
    handleStageTabChange,
    handleAppendixFileUpload,
    handleRemoveAppendixFile,
    handleRecordFileUpload,
    handleRemoveRecordFile
}) => {
    const activeSubTab = stageTabs[activeStageIdx] || 0;

    return (
        <Grid item xs={12} md={9} sx={{ pt: '0px !important' }}>
            {activeStage && (
                <Box 
                    sx={{ 
                        p: 2, 
                        border: '1px solid rgba(226, 232, 240, 0.8)', 
                        borderLeft: '6px solid #7c4dff',
                        borderRadius: '12px', 
                        bgcolor: '#ffffff',
                        boxShadow: '0 2px 8px rgba(149, 157, 165, 0.02)',
                        height: '480px',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', borderBottom: '1px solid #f1f5f9', pb: 1, mb: 1.5 }}>
                        Cấu hình chi tiết giai đoạn
                    </Typography>

                    {/* Fixed header section (Tên giai đoạn, Giá trị, Ngày dự kiến & Tabs chọn) */}
                    <Stack spacing={2} sx={{ mb: 1.5, flexShrink: 0 }}>
                        <Grid container spacing={1.5}>
                            <Grid item xs={12} md={5}>
                                <TextField
                                    size="small"
                                    fullWidth
                                    label="Tên giai đoạn"
                                    placeholder="Tên giai đoạn"
                                    value={activeStage.name}
                                    onChange={(e) => handleStageChange(activeStageIdx, 'name', e.target.value)}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontWeight: 600 } }}
                                />
                            </Grid>
                            <Grid item xs={12} md={2.5}>
                                <TextField
                                    size="small"
                                    fullWidth
                                    type="number"
                                    label="Giá trị"
                                    placeholder="0"
                                    value={activeStage.amount}
                                    onChange={(e) => handleStageChange(activeStageIdx, 'amount', e.target.value)}
                                    slotProps={{
                                        input: {
                                            startAdornment: <InputAdornment position="start"><IconCash size={14} style={{ color: '#7c4dff' }} /></InputAdornment>,
                                            endAdornment: <InputAdornment position="end" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>VND</InputAdornment>,
                                            sx: { borderRadius: '8px' }
                                        }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} md={2.5}>
                                <DatePicker
                                    label="Ngày dự kiến"
                                    value={activeStage.date}
                                    onChange={(val) => handleStageChange(activeStageIdx, 'date', val)}
                                    format="DD/MM/YYYY"
                                    slotProps={{ 
                                        textField: { 
                                            fullWidth: true, 
                                            size: 'small', 
                                            sx: { '& .MuiOutlinedInput-root': { borderRadius: '8px' } } 
                                        } 
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <FormControl fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}>
                                    <InputLabel>Trạng thái</InputLabel>
                                    <Select
                                        value={activeStage.status || 'Chưa thực hiện'}
                                        label="Trạng thái"
                                        onChange={(e) => handleStageChange(activeStageIdx, 'status', e.target.value)}
                                    >
                                        <MenuItem value="Chưa thực hiện">Chưa thực hiện</MenuItem>
                                        <MenuItem value="Đang thực hiện">Đang thực hiện</MenuItem>
                                        <MenuItem value="Đã nghiệm thu">Đã nghiệm thu</MenuItem>
                                        <MenuItem value="Đã thanh toán">Đã thanh toán</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>

                        {/* Modern Segmented Controller for sub-tabs */}
                        <Box 
                            sx={{ 
                                bgcolor: '#f1f5f9', 
                                borderRadius: '10px', 
                                p: '3px', 
                                display: 'flex' 
                            }}
                        >
                            <Tabs 
                                value={activeSubTab} 
                                onChange={(e, val) => handleStageTabChange(activeStageIdx, val)} 
                                textColor="secondary" 
                                indicatorColor="none"
                                variant="fullWidth"
                                TabIndicatorProps={{ style: { display: 'none' } }}
                                sx={{
                                    width: '100%',
                                    minHeight: '32px',
                                    '& .MuiTabs-flexContainer': { gap: 0 }
                                }}
                            >
                                {['Phụ lục', 'Nghiệm thu (BBNT)', 'Thanh toán (BBTT)'].map((label, tIdx) => (
                                    <Tab 
                                        key={tIdx}
                                        label={label} 
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            minHeight: '32px',
                                            py: 0.5,
                                            fontSize: '0.8rem',
                                            borderRadius: '6px',
                                            color: '#64748b',
                                            transition: 'all 0.15s',
                                            '&.Mui-selected': {
                                                color: '#1e293b',
                                                bgcolor: '#ffffff',
                                                boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
                                            }
                                        }}
                                    />
                                ))}
                            </Tabs>
                        </Box>
                    </Stack>

                    {/* Isolated scrollable body section */}
                    <Box sx={{ overflowY: 'auto', flex: 1, pr: 0.5 }}>
                        {activeSubTab === 0 && (
                            <AppendixTab
                                activeStage={activeStage}
                                activeStageIdx={activeStageIdx}
                                values={values}
                                setValues={setValues}
                                uploading={uploading}
                                setUploading={setUploading}
                                handleAppendixFileUpload={handleAppendixFileUpload}
                                handleRemoveAppendixFile={handleRemoveAppendixFile}
                            />
                        )}

                        {activeSubTab === 1 && (
                            <AcceptanceTab
                                activeStage={activeStage}
                                activeStageIdx={activeStageIdx}
                                values={values}
                                setValues={setValues}
                                uploading={uploading}
                                setUploading={setUploading}
                                handleRecordFileUpload={handleRecordFileUpload}
                                handleRemoveRecordFile={handleRemoveRecordFile}
                            />
                        )}

                        {activeSubTab === 2 && (
                            <PaymentTab
                                activeStage={activeStage}
                                activeStageIdx={activeStageIdx}
                                values={values}
                                setValues={setValues}
                                uploading={uploading}
                                setUploading={setUploading}
                                handleRecordFileUpload={handleRecordFileUpload}
                                handleRemoveRecordFile={handleRemoveRecordFile}
                            />
                        )}
                    </Box>
                </Box>
            )}
        </Grid>
    );
};

export default StageWorkspace;
