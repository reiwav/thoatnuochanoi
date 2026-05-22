import { Box, Typography, Button, Stack, TextField, IconButton, InputAdornment } from '@mui/material';
import { IconPlus, IconTrash, IconCash } from '@tabler/icons-react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

const ContractStages = ({ stages, handleStageChange, addStage, removeStage }) => {
    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
                {stages.map((stage, index) => (
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
                                <IconButton size="small" color="error" onClick={() => removeStage(index)} disabled={stages.length === 1}>
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
                                    format="DD/MM/YYYY"
                                    slotProps={{ textField: { fullWidth: true, size: 'small', sx: { bgcolor: 'white' } } }}
                                />
                            </Stack>
                        </Stack>
                    </Box>
                ))}
            </Stack>
        </Box>
    );
};

export default ContractStages;
