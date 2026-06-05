import React from 'react';
import {
    Box, TextField, Button, Stack, Typography, Paper,
    Avatar, Divider, Pagination, CircularProgress, List,
    ListItem, ListItemText, Grid, Switch, FormControlLabel
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { IconDoorEnter, IconClock, IconCheck, IconHistory, IconUser } from '@tabler/icons-react';
import dayjs from 'dayjs';
import PermissionGuard from 'ui-component/PermissionGuard';
import useSluiceGateReport from './hooks/useSluiceGateReport';
import useAuthStore from 'store/useAuthStore';

const SluiceGateReport = ({ station, onSuccess }) => {
    const theme = useTheme();
    const { isEmployee } = useAuthStore();
    const {
        formData,
        setFormData,
        history,
        total,
        page,
        setPage,
        loadingHistory,
        handleSubmit,
        perPage
    } = useSluiceGateReport({ station, onSuccess });

    return (
        <Box sx={{ width: '100%' }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{ flex: 1, pr: 2 }}>
                        <Typography variant="h2" sx={{ fontWeight: 900, mb: 0.5, fontSize: { xs: '1.5rem', sm: '2.2rem' }, color: 'primary.dark' }}>
                            {station.name}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                            Báo cáo vận hành cửa phai
                        </Typography>
                    </Box>
                    <Avatar
                        sx={{
                            width: { xs: 56, sm: 80 },
                            height: { xs: 56, sm: 80 },
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                            boxShadow: `0 8px 24px -8px ${alpha(theme.palette.primary.main, 0.4)}`
                        }}
                    >
                        <IconDoorEnter size={40} />
                    </Avatar>
                </Stack>
            </Box>

            {/* Input Section */}
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2, sm: 3 },
                    borderRadius: '24px',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
                    mb: 2
                }}
            >
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.primary' }}>
                    <IconClock size={28} color={theme.palette.primary.main} />
                    Cập nhật nhận xét vận hành
                </Typography>
                
                {formData.doors && formData.doors.length > 0 && (
                    <Box sx={{ mb: 3.5 }}>
                        <Typography variant="h4" sx={{ fontWeight: 800, mb: 2, color: 'primary.dark' }}>
                            Trạng thái các cửa phai (Bật/Tắt)
                        </Typography>
                        <Grid container spacing={2}>
                            {formData.doors.map((doorState, idx) => (
                                <Grid item xs={12} sm={4} key={idx}>
                                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.01), display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                            Cửa số {idx + 1}
                                        </Typography>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={!!doorState}
                                                    onChange={(e) => {
                                                        const nextDoors = [...formData.doors];
                                                        nextDoors[idx] = e.target.checked;
                                                        setFormData(prev => ({ ...prev, doors: nextDoors }));
                                                    }}
                                                    color="primary"
                                                />
                                            }
                                            label={doorState ? "MỞ" : "ĐÓNG"}
                                            labelPlacement="start"
                                            sx={{ mr: 0, '& .MuiTypography-root': { fontWeight: 900, fontSize: '0.875rem', color: doorState ? 'success.main' : 'text.disabled' } }}
                                        />
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                )}

                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1.5, color: 'text.primary' }}>
                    Ghi chú / Nhận xét vận hành
                </Typography>
                <TextField
                    fullWidth
                    placeholder="Nhập ghi chú vận hành, tình trạng cửa phai..."
                    multiline
                    rows={3}
                    value={formData.note}
                    onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '16px',
                            fontSize: '1rem',
                            bgcolor: alpha(theme.palette.primary.main, 0.02),
                            '&.Mui-focused': {
                                bgcolor: 'transparent',
                                boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.1)}`
                            }
                        }
                    }}
                />
                <Box sx={{ mt: 3 }}>
                    <PermissionGuard permission="sluice-gate:report">
                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            startIcon={<IconCheck size={22} />}
                            onClick={handleSubmit}
                            sx={{
                                borderRadius: '16px',
                                py: 1.5,
                                fontSize: '1.1rem',
                                fontWeight: 700,
                                textTransform: 'none',
                                '&:hover': { transform: 'translateY(-1px)' }
                            }}
                        >
                            Gửi báo cáo vận hành
                        </Button>
                    </PermissionGuard>
                </Box>
            </Paper>

            {/* History Section */}
            {!isEmployee && (
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 2, sm: 3 },
                        borderRadius: '24px',
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
                        <IconHistory size={28} color={theme.palette.secondary.main} />
                        <Typography variant="h4" sx={{ fontWeight: 800 }}>Lịch sử báo cáo</Typography>
                    </Stack>

                    {loadingHistory ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress size={32} />
                        </Box>
                    ) : (
                        <>
                            <List disablePadding>
                                {history.length > 0 ? (
                                    history.map((item, index) => (
                                        <React.Fragment key={item.id || index}>
                                            <ListItem alignItems="flex-start" sx={{ px: 0, py: 1 }}>
                                                <ListItemText
                                                    primary={
                                                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                                                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                                                {dayjs(item.timestamp * 1000).format('DD/MM/YYYY HH:mm')}
                                                            </Typography>
                                                            <Stack direction="row" spacing={0.5} alignItems="center">
                                                                <IconUser size={14} color={theme.palette.text.secondary} />
                                                                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                                                    {item.user_name}
                                                                </Typography>
                                                            </Stack>
                                                        </Stack>
                                                    }
                                                    secondary={
                                                        <Stack spacing={1} sx={{ mt: 1 }}>
                                                            {item.doors && item.doors.length > 0 && (
                                                                <Grid container spacing={1} sx={{ mb: 0.5 }}>
                                                                    {item.doors.map((doorState, idx) => (
                                                                        <Grid item xs={6} sm={3} key={idx}>
                                                                            <Box sx={{ px: 1.5, py: 0.5, bgcolor: doorState ? alpha(theme.palette.success.main, 0.08) : alpha(theme.palette.grey[200], 0.5), color: doorState ? theme.palette.success.dark : theme.palette.text.secondary, borderRadius: 1.5, display: 'flex', justifyContent: 'space-between', border: '1px solid', borderColor: doorState ? alpha(theme.palette.success.main, 0.2) : theme.palette.grey[300] }}>
                                                                                <Typography variant="caption" sx={{ fontWeight: 700 }}>Cửa số {idx + 1}</Typography>
                                                                                <Typography variant="caption" sx={{ fontWeight: 900 }}>{doorState ? "MỞ" : "ĐÓNG"}</Typography>
                                                                            </Box>
                                                                        </Grid>
                                                                    ))}
                                                                </Grid>
                                                            )}
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    color: 'text.primary',
                                                                    bgcolor: 'grey.50',
                                                                    p: 1.5,
                                                                    borderRadius: 2,
                                                                    border: '1px solid',
                                                                    borderColor: 'divider',
                                                                    whiteSpace: 'pre-wrap'
                                                                }}
                                                            >
                                                                {item.note}
                                                            </Typography>
                                                        </Stack>
                                                    }
                                                />
                                            </ListItem>
                                            {index < history.length - 1 && <Divider component="li" sx={{ borderStyle: 'dashed' }} />}
                                        </React.Fragment>
                                    ))
                                ) : (
                                    <Typography align="center" variant="body2" color="text.secondary" sx={{ py: 4 }}>
                                        Chưa có báo cáo nào được ghi nhận.
                                    </Typography>
                                )}
                            </List>
                            {total > perPage && (
                                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                                    <Pagination
                                        count={Math.ceil(total / perPage)}
                                        page={page}
                                        onChange={(e, v) => setPage(v)}
                                        color="primary"
                                        size="small"
                                    />
                                </Box>
                            )}
                        </>
                    )}
                </Paper>
            )}
        </Box>
    );
};

export default SluiceGateReport;
