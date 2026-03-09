import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, TextField, IconButton, Paper, Stack,
    Avatar, CircularProgress, Divider, LinearProgress, Tooltip, Button,
    useMediaQuery, SwipeableDrawer
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    IconSend, IconRobot, IconUser, IconMail, IconDatabase,
    IconLayoutSidebarLeftCollapse, IconRefresh, IconBolt,
    IconLayoutSidebarRightExpand, IconLayoutSidebarRightCollapse
} from '@tabler/icons-react';
import axiosClient from 'api/axiosClient';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const AiSupport = () => {
    const [messages, setMessages] = useState([
        { id: 1, role: 'ai', text: 'Chào bạn! Tôi là trợ lý AI của Hệ thống Thoát nước Hà Nội. Tôi có thể giúp gì cho bạn hôm nay?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        unread_emails: 0,
        drive_quota: { limit: 0, usage: 0, usage_in_drive: 0 },
        ai_usage: { total_tokens: 0, total_cost_usd: 0, request_count: 0 }
    });
    const [statsLoading, setStatsLoading] = useState(true);
    const scrollRef = useRef(null);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [showStats, setShowStats] = useState(false);

    const fetchStats = async () => {
        setStatsLoading(true);
        try {
            const res = await axiosClient.get('/admin/google/status');
            if (res.data?.status === 'success') {
                setStats(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch Google status:', error);
        } finally {
            setStatsLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (directText = null) => {
        const textToSend = directText || input;
        if (!textToSend.trim()) return;

        const userMsg = { id: Date.now(), role: 'user', text: textToSend };
        const history = messages.map(m => ({
            role: m.role === 'ai' ? 'model' : 'user',
            content: m.text
        }));

        setMessages(prev => [...prev, userMsg]);
        if (!directText) setInput('');
        setLoading(true);

        try {
            const res = await axiosClient.post('/admin/google/chat', {
                prompt: textToSend,
                history: history
            });
            const aiMsg = {
                id: Date.now() + 1,
                role: 'ai',
                text: res.data?.data || 'Xin lỗi, tôi gặp trục trặc khi xử lý câu hỏi này.'
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error('Chat failed:', error);
            const aiMsg = {
                id: Date.now() + 1,
                role: 'ai',
                text: 'Có lỗi kết nối đến máy chủ AI. Vui lòng thử lại sau.'
            };
            setMessages(prev => [...prev, aiMsg]);
        } finally {
            setLoading(false);
        }
    };

    const handleSendQuestion = (text) => {
        handleSend(text);
    };

    const handleRainSummary = async () => {
        const text = 'Tình hình mưa đang như thế nào?';
        const userMsg = { id: Date.now(), role: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        try {
            const res = await axiosClient.get('/admin/google/rain-summary');
            const data = res.data?.data;
            let displayText = '';

            if (typeof data === 'string') {
                displayText = data;
            } else if (data && typeof data === 'object') {
                if (data.rainy_stations === 0) {
                    displayText = 'Hiện tại ghi nhận không có mưa tại tất cả các trạm.';
                } else {
                    displayText = `Tình hình mưa hiện tại:\n- Tổng số trạm: ${data.total_stations}\n- Số trạm đang có mưa: ${data.rainy_stations}\n- Trạm mưa lớn nhất: ${data.max_rain_station?.name} (${data.max_rain_station?.total_rain}mm)\n\nChi tiết một số trạm mưa lớn:\n` +
                        data.measurements.slice(0, 5).map(m => `- ${m.name}: ${m.total_rain}mm (Bắt đầu từ ${m.start_time})`).join('\n');
                }
            } else {
                displayText = 'Không thể lấy thông tin lượng mưa lúc này.';
            }

            const aiMsg = {
                id: Date.now() + 1,
                role: 'ai',
                text: displayText
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            const aiMsg = {
                id: Date.now() + 1,
                role: 'ai',
                text: 'Có lỗi xảy ra khi truy vấn dữ liệu mưa. Vui lòng thử lại sau.'
            };
            setMessages(prev => [...prev, aiMsg]);
        } finally {
            setLoading(false);
        }
    };

    const handleEmailDetail = async (emailId) => {
        setLoading(true);
        try {
            const res = await axiosClient.get(`/admin/google/email/${emailId}`);
            if (res.data?.status === 'success') {
                const detail = res.data.data;
                let attachmentsText = '';
                if (detail.attachments && detail.attachments.length > 0) {
                    attachmentsText = '\n\n**File đính kèm:**\n' + detail.attachments.map(a => `- [${a.filename}](http://localhost:8089${a.url})`).join('\n');
                }

                const aiMsg = {
                    id: Date.now(),
                    role: 'ai',
                    text: `### ${detail.subject}\n**Từ:** ${detail.from}\n**Ngày:** ${detail.date}\n\n${detail.body}${attachmentsText}`
                };
                setMessages(prev => [...prev, aiMsg]);
                // Refresh stats to update unread count
                fetchStats();
            }
        } catch (error) {
            console.error('Failed to fetch email detail:', error);
            const aiMsg = {
                id: Date.now(),
                role: 'ai',
                text: 'Không thể lấy thông tin chi tiết email này. Vui lòng thử lại sau.'
            };
            setMessages(prev => [...prev, aiMsg]);
        } finally {
            setLoading(false);
        }
    };

    const handleListEmails = async (type) => {
        setLoading(true);
        const label = type === 'recent' ? '10 email gần đây' : '10 email mới nhất';
        const url = type === 'recent' ? '/admin/google/emails/recent' : '/admin/google/emails/unread';

        try {
            const res = await axiosClient.get(url);
            if (res.data?.status === 'success') {
                const emails = res.data.data;
                let tableText = `### Danh sách ${label}\n\n`;

                if (emails.length === 0) {
                    tableText += 'Không tìm thấy email nào.';
                } else {
                    tableText += '| Người gửi | Tiêu đề | Thời gian | Thao tác |\n';
                    tableText += '| :--- | :--- | :--- | :--- |\n';
                    emails.forEach(m => {
                        tableText += `| ${m.from} | ${m.subject} | ${m.date} | [Xem chi tiết](#email-detail-${m.id}) |\n`;
                    });
                }

                const aiMsg = {
                    id: Date.now(),
                    role: 'ai',
                    text: tableText
                };
                setMessages(prev => [...prev, aiMsg]);
            }
        } catch (error) {
            console.error('Failed to list emails:', error);
            const aiMsg = {
                id: Date.now(),
                role: 'ai',
                text: 'Không thể lấy danh sách email lúc này. Vui lòng thử lại sau.'
            };
            setMessages(prev => [...prev, aiMsg]);
        } finally {
            setLoading(false);
        }
    };

    const handleListConstructions = async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get('/admin/emergency-constructions');
            if (res.data?.status === 'success') {
                const items = res.data.data.data;
                let tableText = `### Danh sách Công trình khẩn\n\n`;

                if (items.length === 0) {
                    tableText += 'Không tìm thấy công trình nào.';
                } else {
                    tableText += '| Tên công trình | Địa điểm | Trạng thái | Thao tác |\n';
                    tableText += '| :--- | :--- | :--- | :--- |\n';
                    items.forEach(item => {
                        tableText += `| ${item.name} | ${item.location} | ${item.status} | [Xem lịch sử](#emc-history-${item.id}) |\n`;
                    });
                }

                const aiMsg = {
                    id: Date.now(),
                    role: 'ai',
                    text: tableText
                };
                setMessages(prev => [...prev, aiMsg]);
            }
        } catch (error) {
            console.error('Failed to list constructions:', error);
            const aiMsg = {
                id: Date.now(),
                role: 'ai',
                text: 'Không thể lấy danh sách công trình lúc này. Vui lòng thử lại sau.'
            };
            setMessages(prev => [...prev, aiMsg]);
        } finally {
            setLoading(false);
        }
    };

    const handleEmcHistory = async (id) => {
        setLoading(true);
        try {
            const res = await axiosClient.get(`/admin/emergency-constructions/${id}/progress`);
            if (res.data?.status === 'success') {
                const history = res.data.data;
                let historyText = `### Lịch sử thi công\n\n`;

                if (history.length === 0) {
                    historyText += 'Chưa có báo cáo tiến độ nào cho công trình này.';
                } else {
                    history.forEach(h => {
                        const date = new Date(h.report_date * 1000).toLocaleString('vi-VN');
                        historyText += `**Ngày:** ${date}\n`;
                        historyText += `**Công việc:** ${h.work_done}\n`;
                        if (h.progress_percentage > 0) {
                            historyText += `**Tiến độ:** ${h.progress_percentage}%\n`;
                        }
                        if (h.issues) {
                            historyText += `**Khó khăn/Vướng mắc:** ${h.issues}\n`;
                        }
                        if (h.is_completed) {
                            historyText += `**Trạng thái:** ✅ Đã hoàn thành\n`;
                        } else if (h.expected_completion_date > 0) {
                            const expDate = new Date(h.expected_completion_date * 1000).toLocaleDateString('vi-VN');
                            historyText += `**Dự kiến xong:** ${expDate}\n`;
                        }

                        if (h.reporter_name) {
                            historyText += `**Người báo cáo:** ${h.reporter_name} (${h.reporter_email})\n`;
                            if (h.reporter_org_name) {
                                historyText += `**Đơn vị:** ${h.reporter_org_name}\n`;
                            }
                        }
                        historyText += `---\n`;
                    });
                }

                const aiMsg = {
                    id: Date.now(),
                    role: 'ai',
                    text: historyText
                };
                setMessages(prev => [...prev, aiMsg]);
            }
        } catch (error) {
            console.error('Failed to fetch emc history:', error);
            const aiMsg = {
                id: Date.now(),
                role: 'ai',
                text: 'Không thể lấy lịch sử thi công này. Vui lòng thử lại sau.'
            };
            setMessages(prev => [...prev, aiMsg]);
        } finally {
            setLoading(false);
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const quotaPercentage = stats.drive_quota.limit > 0
        ? Math.round((stats.drive_quota.usage / stats.drive_quota.limit) * 100)
        : 0;

    return (
        <Box sx={{ height: 'calc(100vh - 140px)', display: 'flex', gap: isMobile ? 0 : 3, position: 'relative' }}>
            {/* Main Chat Area */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
                {/* Chat Header */}
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                            <IconRobot size={24} />
                        </Avatar>
                        <Box>
                            <Typography variant="h4" fontWeight={800}>Hỗ trợ AI</Typography>
                            <Typography variant="caption" color="text.secondary">Trợ lý ảo thông minh TNHN</Typography>
                        </Box>
                    </Box>
                    <Tooltip title={showStats ? "Ẩn trạng thái" : "Xem trạng thái hệ thống"}>
                        <IconButton
                            onClick={() => setShowStats(!showStats)}
                            color={showStats ? "primary" : "default"}
                            sx={{ bgcolor: showStats ? 'primary.light' : 'transparent' }}
                        >
                            {showStats ? <IconLayoutSidebarRightCollapse size={22} /> : <IconLayoutSidebarRightExpand size={22} />}
                        </IconButton>
                    </Tooltip>
                </Box>

                {/* Messages List */}
                <Box ref={scrollRef} sx={{ flex: 1, p: 3, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3, scrollBehavior: 'smooth' }}>
                    {messages.map((msg) => (
                        <Box key={msg.id} sx={{
                            display: 'flex',
                            gap: 2,
                            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                            alignItems: 'flex-start'
                        }}>
                            <Avatar sx={{
                                bgcolor: msg.role === 'user' ? 'primary.light' : 'secondary.light',
                                color: msg.role === 'user' ? 'primary.main' : 'secondary.main',
                                width: 32, height: 32
                            }}>
                                {msg.role === 'user' ? <IconUser size={18} /> : <IconRobot size={18} />}
                            </Avatar>
                            <Paper sx={{
                                p: 2,
                                borderRadius: msg.role === 'user' ? '20px 4px 20px 20px' : '4px 20px 20px 20px',
                                maxWidth: '70%',
                                bgcolor: msg.role === 'user' ? 'primary.main' : '#f8fafc',
                                color: msg.role === 'user' ? 'white' : 'text.primary',
                                boxShadow: 'none',
                                border: msg.role === 'ai' ? '1px solid #e2e8f0' : 'none'
                            }}>
                                <Box sx={{
                                    '& p': { m: 0, '&:not(:last-child)': { mb: 1.5 } },
                                    '& a': { color: msg.role === 'user' ? 'white' : 'primary.main', textDecoration: 'underline' },
                                    '& table': {
                                        width: '100%',
                                        borderCollapse: 'collapse',
                                        my: 1.5,
                                        fontSize: '13px',
                                        border: '1px solid',
                                        borderColor: msg.role === 'user' ? 'rgba(255,255,255,0.2)' : 'divider'
                                    },
                                    '& th, & td': {
                                        p: 1,
                                        border: '1px solid',
                                        borderColor: msg.role === 'user' ? 'rgba(255,255,255,0.2)' : 'divider',
                                        textAlign: 'left'
                                    },
                                    '& th': { bgcolor: msg.role === 'user' ? 'rgba(255,255,255,0.1)' : '#f1f5f9', fontWeight: 700 },
                                    '& ul, & ol': { pl: 2, my: 1 },
                                    '& li': { mb: 0.5 }
                                }}>
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        transformUri={uri => uri}
                                        components={{
                                            a: ({ node, ...props }) => {
                                                if (props.href && props.href.startsWith('#email-detail-')) {
                                                    const emailId = props.href.replace('#email-detail-', '');
                                                    return (
                                                        <Box component="span" sx={{ display: 'inline-block', my: 0.5 }}>
                                                            <Tooltip title="Đọc nội dung chi tiết email này">
                                                                <IconButton
                                                                    size="small"
                                                                    color="primary"
                                                                    sx={{
                                                                        bgcolor: 'primary.light',
                                                                        '&:hover': { bgcolor: 'primary.main', color: 'white' },
                                                                        borderRadius: '8px',
                                                                        fontSize: '12px',
                                                                        px: 1.5,
                                                                        py: 0.5,
                                                                        height: 'auto',
                                                                        width: 'auto',
                                                                        gap: 0.5
                                                                    }}
                                                                    onClick={(e) => {
                                                                        e?.preventDefault();
                                                                        handleEmailDetail(emailId);
                                                                    }}
                                                                >
                                                                    <IconMail size={14} />
                                                                    <Typography variant="caption" fontWeight={700} sx={{ color: 'inherit' }}>
                                                                        Xem chi tiết
                                                                    </Typography>
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    );
                                                }
                                                if (props.href && props.href.startsWith('#emc-history-')) {
                                                    const emcId = props.href.replace('#emc-history-', '');
                                                    return (
                                                        <Box component="span" sx={{ display: 'inline-block', my: 0.5 }}>
                                                            <Tooltip title="Xem lịch sử báo cáo thi công">
                                                                <IconButton
                                                                    size="small"
                                                                    color="warning"
                                                                    sx={{
                                                                        bgcolor: 'warning.light',
                                                                        '&:hover': { bgcolor: 'warning.main', color: 'white' },
                                                                        borderRadius: '8px',
                                                                        fontSize: '12px',
                                                                        px: 1.5,
                                                                        py: 0.5,
                                                                        height: 'auto',
                                                                        width: 'auto',
                                                                        gap: 0.5
                                                                    }}
                                                                    onClick={(e) => {
                                                                        e?.preventDefault();
                                                                        handleEmcHistory(emcId);
                                                                    }}
                                                                >
                                                                    <IconBolt size={14} />
                                                                    <Typography variant="caption" fontWeight={700} sx={{ color: 'inherit' }}>
                                                                        Xem lịch sử
                                                                    </Typography>
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    );
                                                }
                                                return <a {...props} target="_blank" rel="noopener noreferrer" style={{ color: '#1B5E20', fontWeight: 600 }} />;
                                            }
                                        }}
                                    >
                                        {typeof msg.text === 'string' ? msg.text : JSON.stringify(msg.text)}
                                    </ReactMarkdown>
                                </Box>
                            </Paper>
                        </Box>
                    ))}
                    {loading && (
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'secondary.light', color: 'secondary.main', width: 32, height: 32 }}>
                                <IconRobot size={18} />
                            </Avatar>
                            <Paper sx={{ p: 2, borderRadius: '4px 20px 20px 20px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                                <CircularProgress size={20} color="secondary" />
                            </Paper>
                        </Box>
                    )}
                </Box>

                {/* Suggested Questions */}
                {!loading && messages.length === 1 && (
                    <Box sx={{ px: 3, pb: 2, display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                        {[
                            { text: 'Tình hình mưa đang như thế nào?', type: 'rain' },
                            { text: 'Kiểm tra dung lượng bộ nhớ', type: 'storage' },
                            { text: 'Có email mới nào không?', type: 'email' }
                        ].map((q, i) => (
                            <Paper
                                key={i}
                                onClick={() => q.type === 'rain' ? handleRainSummary() : handleSendQuestion(q.text)}
                                sx={{
                                    px: 2, py: 1, borderRadius: '12px', cursor: 'pointer',
                                    border: '1px solid', borderColor: 'primary.200',
                                    color: 'primary.main', fontSize: '13px', fontWeight: 600,
                                    transition: 'all 0.2s',
                                    '&:hover': { bgcolor: 'primary.light', borderColor: 'primary.main' }
                                }}
                            >
                                {q.text}
                            </Paper>
                        ))}
                    </Box>
                )}

                {/* Input Area */}
                <Box sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
                    <TextField
                        fullWidth
                        placeholder="Nhập câu hỏi của bạn tại đây..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        disabled={loading}
                        InputProps={{
                            endAdornment: (
                                <IconButton color="primary" onClick={handleSend} disabled={!input.trim() || loading}>
                                    <IconSend size={24} />
                                </IconButton>
                            ),
                            sx: { borderRadius: '16px', bgcolor: '#f8fafc', p: '4px 8px' }
                        }}
                    />
                </Box>
            </Box>

            {/* Stats Sidebar/Drawer */}
            {isMobile ? (
                <SwipeableDrawer
                    anchor="right"
                    open={showStats}
                    onClose={() => setShowStats(false)}
                    onOpen={() => setShowStats(true)}
                    PaperProps={{
                        sx: { width: '85%', maxWidth: 360, p: 2, borderRadius: '20px 0 0 20px' }
                    }}
                >
                    <StatsContent stats={stats} statsLoading={statsLoading} fetchStats={fetchStats} formatBytes={formatBytes} quotaPercentage={quotaPercentage} handleListEmails={handleListEmails} handleListConstructions={handleListConstructions} setMessages={setMessages} setLoading={setLoading} />
                </SwipeableDrawer>
            ) : (
                showStats && (
                    <Box sx={{ width: 320, display: 'flex', flexDirection: 'column', gap: 2, animation: 'slideIn 0.3s ease' }}>
                        <StatsContent stats={stats} statsLoading={statsLoading} fetchStats={fetchStats} formatBytes={formatBytes} quotaPercentage={quotaPercentage} handleListEmails={handleListEmails} handleListConstructions={handleListConstructions} setMessages={setMessages} setLoading={setLoading} />
                    </Box>
                )
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes slideIn {
                    from { transform: translateX(20px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}} />
        </Box>
    );
};

const StatsContent = ({ stats, statsLoading, fetchStats, formatBytes, quotaPercentage, handleListEmails, handleListConstructions, setMessages, setLoading }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Paper sx={{ p: 1.5, borderRadius: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" fontWeight={800}>Trạng thái hệ thống</Typography>
                <IconButton size="small" onClick={fetchStats} disabled={statsLoading}>
                    <IconRefresh size={18} />
                </IconButton>
            </Stack>

            <Stack spacing={2.5}>
                {/* Email Stat */}
                <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                        <Avatar sx={{ width: 28, height: 28, bgcolor: '#fee2e2', color: '#ef4444' }}>
                            <IconMail size={16} />
                        </Avatar>
                        <Typography variant="subtitle2" fontWeight={800} color="text.secondary">GMAIL</Typography>
                    </Stack>
                    {statsLoading ? <LinearProgress sx={{ height: 2, borderRadius: 1 }} /> : (
                        <Box sx={{ ml: 4.5 }}>
                            <Typography variant="h4" fontWeight={800} color="error.main" sx={{ mb: 1 }}>
                                {stats.unread_emails} <Typography component="span" variant="body2" fontWeight={600} color="text.secondary">mới</Typography>
                            </Typography>

                            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => handleListEmails('recent')}
                                    sx={{ fontSize: '10px', py: 0.5, borderRadius: '8px' }}
                                >
                                    Email gần đây
                                </Button>
                                <Button
                                    size="small"
                                    variant="contained"
                                    disabled={stats.unread_emails === 0}
                                    onClick={() => handleListEmails('unread')}
                                    sx={{ fontSize: '10px', py: 0.5, borderRadius: '8px', boxShadow: 'none' }}
                                >
                                    Email mới
                                </Button>
                            </Stack>
                        </Box>
                    )}
                </Box>

                <Divider />

                {/* Storage Stat */}
                <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                        <Avatar sx={{ width: 28, height: 28, bgcolor: '#e0f2fe', color: '#0369a1' }}>
                            <IconDatabase size={16} />
                        </Avatar>
                        <Typography variant="subtitle2" fontWeight={800} color="text.secondary">GOOGLE DRIVE</Typography>
                    </Stack>
                    {statsLoading ? <LinearProgress sx={{ height: 2, borderRadius: 1 }} /> : (
                        <Box sx={{ ml: 4.5 }}>
                            <Stack direction="row" justifyContent="space-between" mb={1}>
                                <Typography variant="body2" fontWeight={800}>{quotaPercentage}% đã dùng</Typography>
                                <Typography variant="caption" fontWeight={600} color="text.secondary">{formatBytes(stats.drive_quota.usage)}/{formatBytes(stats.drive_quota.limit)}</Typography>
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
                    <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                        <Avatar sx={{ width: 28, height: 28, bgcolor: '#fef3c7', color: '#d97706' }}>
                            <IconBolt size={16} />
                        </Avatar>
                        <Typography variant="subtitle2" fontWeight={800} color="text.secondary">LƯU LƯỢNG AI</Typography>
                    </Stack>
                    {statsLoading ? <LinearProgress sx={{ height: 2, borderRadius: 1 }} /> : (
                        <Box sx={{ ml: 4.5 }}>
                            <Typography variant="h4" fontWeight={800} color="warning.dark" sx={{ mb: 1 }}>
                                {stats.ai_usage.total_tokens?.toLocaleString()} <Typography component="span" variant="body2" fontWeight={600} color="text.secondary">tokens</Typography>
                            </Typography>
                            <Stack spacing={1}>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary" fontWeight={600}>Chi phí dự tính:</Typography>
                                    <Typography variant="body2" fontWeight={800} color="success.main">
                                        ${stats.ai_usage.total_cost_usd?.toFixed(4)}
                                    </Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary" fontWeight={600}>Số lượt truy vấn:</Typography>
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
                    <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                        <Avatar sx={{ width: 28, height: 28, bgcolor: '#fff7ed', color: '#f97316' }}>
                            <IconBolt size={16} />
                        </Avatar>
                        <Typography variant="subtitle2" fontWeight={800} color="text.secondary">CÔNG TRÌNH KHẨN</Typography>
                    </Stack>
                    <Box sx={{ ml: 4.5 }}>
                        <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            onClick={handleListConstructions}
                            sx={{ fontSize: '10px', py: 0.5, borderRadius: '8px' }}
                        >
                            Xem danh sách
                        </Button>
                    </Box>
                </Box>

                <Divider />
            </Stack>
        </Paper>

        <Paper sx={{ p: 2, borderRadius: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle2" fontWeight={800} mb={2}>Tiện ích báo cáo</Typography>
            <Stack spacing={1.5}>
                <Box
                    onClick={() => {
                        // Add user message
                        const text = 'Tạo báo cáo nhanh';
                        const userMsg = { id: Date.now(), role: 'user', text };
                        setMessages(prev => [...prev, userMsg]);
                        setLoading(true);

                        axiosClient.post('/admin/google/quick-report', { data: {} })
                            .then(res => {
                                const data = res.data?.data;
                                const reportUrl = data?.report_url || data?.report_link;
                                const msgText = reportUrl
                                    ? `Đã tạo xong báo cáo nhanh! Bạn có thể xem và tải về tại đây:\n${reportUrl}`
                                    : 'Đã gửi yêu cầu tạo báo cáo nhanh thành công, nhưng không nhận được đường dẫn trả về.';

                                const aiMsg = {
                                    id: Date.now() + 1,
                                    role: 'ai',
                                    text: msgText
                                };
                                setMessages(prev => [...prev, aiMsg]);
                            })
                            .catch(err => {
                                const aiMsg = {
                                    id: Date.now() + 1,
                                    role: 'ai',
                                    text: 'Có lỗi xảy ra khi tạo báo cáo nhanh. Vui lòng thử lại sau.'
                                };
                                setMessages(prev => [...prev, aiMsg]);
                            })
                            .finally(() => setLoading(false));
                    }}
                    sx={{
                        p: 1.5, borderRadius: '12px', cursor: 'pointer',
                        bgcolor: 'primary.light', border: '1px solid', borderColor: 'primary.200',
                        color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1.5,
                        transition: 'all 0.2s', '&:hover': { bgcolor: 'primary.main', color: 'white' }
                    }}
                >
                    <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconBolt size={20} />
                    </Box>
                    <Typography variant="body2" fontWeight={700}>Báo cáo nhanh</Typography>
                </Box>

                <Box
                    onClick={() => {
                        const aiMsg = {
                            id: Date.now(),
                            role: 'ai',
                            text: 'Tính năng báo cáo tổng hợp đang được phát triển.'
                        };
                        setMessages(prev => [...prev, aiMsg]);
                    }}
                    sx={{
                        p: 1.5, borderRadius: '12px', cursor: 'pointer',
                        bgcolor: '#f8fafc', border: '1px solid', borderColor: '#e2e8f0',
                        color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1.5,
                        transition: 'all 0.2s', '&:hover': { bgcolor: '#f1f5f9' }
                    }}
                >
                    <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <IconDatabase size={20} color="#64748b" />
                    </Box>
                    <Typography variant="body2" fontWeight={700}>Báo cáo tổng hợp</Typography>
                </Box>
            </Stack>
        </Paper>
    </Box>
);

export default AiSupport;
