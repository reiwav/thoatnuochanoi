import React from 'react';
import { Box, Paper, Stack, Typography, IconButton, Avatar, Divider, LinearProgress, Button } from '@mui/material';
import { IconRefresh, IconMail, IconDatabase, IconBolt } from '@tabler/icons-react';

const StatsContent = ({ 
    stats, 
    statsLoading, 
    fetchStats, 
    formatBytes, 
    quotaPercentage, 
    handleListEmails, 
    handleListConstructions 
}) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
        <Paper sx={{ 
            p: 2.5, 
            borderRadius: '24px', 
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)', 
            border: '1px solid',
            borderColor: 'divider',
            height: '100%',
            overflowY: 'auto'
        }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight={800}>Hệ thống</Typography>
                <IconButton size="small" onClick={fetchStats} disabled={statsLoading} sx={{ bgcolor: 'f1f5f9' }}>
                    <IconRefresh size={18} />
                </IconButton>
            </Stack>

            <Stack spacing={3}>
                {/* Email Stat */}
                <Box>
                    <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#fee2e2', color: '#ef4444' }}>
                            <IconMail size={18} />
                        </Avatar>
                        <Typography variant="subtitle2" fontWeight={800} color="text.secondary">GMAIL</Typography>
                    </Stack>
                    {statsLoading ? <LinearProgress sx={{ height: 4, borderRadius: 2 }} /> : (
                        <Box sx={{ ml: 6 }}>
                            <Typography variant="h3" fontWeight={800} color="error.main" sx={{ mb: 0.5 }}>
                                {stats.unread_emails} <Typography component="span" variant="body1" fontWeight={700} color="text.secondary">mới</Typography>
                            </Typography>
                            <Button size="small" onClick={() => handleListEmails('unread')} sx={{ fontSize: '11px', p: 0, minWidth: 0 }}>Xem ngay</Button>
                        </Box>
                    )}
                </Box>

                <Divider />

                {/* Drive Stat */}
                <Box>
                    <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#dcfce7', color: '#22c55e' }}>
                            <IconDatabase size={18} />
                        </Avatar>
                        <Typography variant="subtitle2" fontWeight={800} color="text.secondary">GOOGLE DRIVE</Typography>
                    </Stack>
                    {statsLoading ? <LinearProgress sx={{ height: 4, borderRadius: 2 }} /> : (
                        <Box sx={{ ml: 6 }}>
                            <Stack direction="row" justifyContent="space-between" mb={1}>
                                <Typography variant="body2" fontWeight={800}>{quotaPercentage}% đã dùng</Typography>
                                <Typography variant="caption" fontWeight={700} color="text.secondary">{formatBytes(stats.drive_quota.usage)}/{formatBytes(stats.drive_quota.limit)}</Typography>
                            </Stack>
                            <LinearProgress
                                variant="determinate"
                                value={quotaPercentage}
                                sx={{ height: 10, borderRadius: 5, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { borderRadius: 5 } }}
                            />
                        </Box>
                    )}
                </Box>

                <Divider />

                {/* AI Usage Stat */}
                <Box>
                    <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#fef3c7', color: '#d97706' }}>
                            <IconBolt size={18} />
                        </Avatar>
                        <Typography variant="subtitle2" fontWeight={800} color="text.secondary">LƯU LƯỢNG AI</Typography>
                    </Stack>
                    {statsLoading ? <LinearProgress sx={{ height: 4, borderRadius: 2 }} /> : (
                        <Box sx={{ ml: 6 }}>
                            <Typography variant="h3" fontWeight={800} color="warning.dark" sx={{ mb: 1.5 }}>
                                {stats.ai_usage.total_tokens?.toLocaleString()} <Typography component="span" variant="body1" fontWeight={700} color="text.secondary">tokens</Typography>
                            </Typography>
                            <Stack spacing={1.5}>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary" fontWeight={700}>Chi phí dự tính:</Typography>
                                    <Typography variant="body2" fontWeight={800} color="success.main">
                                        ${stats.ai_usage.total_cost_usd?.toFixed(4)}
                                    </Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary" fontWeight={700}>Số lượt truy vấn:</Typography>
                                    <Typography variant="body2" fontWeight={800}>
                                        {stats.ai_usage.request_count}
                                    </Typography>
                                </Stack>
                            </Stack>
                        </Box>
                    )}
                </Box>

                <Divider />

                {/* Emergency Construction Stat */}
                <Box>
                    <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#fff7ed', color: '#f97316' }}>
                            <IconBolt size={18} />
                        </Avatar>
                        <Typography variant="subtitle2" fontWeight={800} color="text.secondary">CÔNG TRÌNH KHẨN</Typography>
                    </Stack>
                    <Box sx={{ ml: 6 }}>
                        <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            onClick={handleListConstructions}
                            sx={{ fontSize: '11px', py: 0.5, borderRadius: '8px', fontWeight: 700 }}
                        >
                            Xem danh sách công trình
                        </Button>
                    </Box>
                </Box>
            </Stack>
        </Paper>
    </Box>
);

export default StatsContent;
