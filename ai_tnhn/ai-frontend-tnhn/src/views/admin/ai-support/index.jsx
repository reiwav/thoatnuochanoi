import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Box, TextField, IconButton, Stack,
    CircularProgress, Tooltip,
    useMediaQuery, SwipeableDrawer, Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Zoom, Fab, Typography
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    IconSend, IconArrowDown
} from '@tabler/icons-react';
import axiosClient from 'api/axiosClient';
import useAuthStore from 'store/useAuthStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

// project components
import MessageItem from './components/MessageItem';
import ChatHeader from './components/ChatHeader';
import SuggestedQuestions from './components/SuggestedQuestions';
import StatsContent from './components/StatsContent';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const AiSupport = () => {
    const { user: userInfo, hasPermission } = useAuthStore();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Safety guard: if no ai:chat permission, don't render.
    if (!hasPermission('ai:chat')) return null;

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        unread_emails: 0,
        drive_quota: { limit: 0, usage: 0, usage_in_drive: 0 },
        ai_usage: { total_tokens: 0, total_cost_usd: 0, request_count: 0 }
    });
    const [statsLoading, setStatsLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [openReportDialog, setOpenReportDialog] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [showScrollBottom, setShowScrollBottom] = useState(false);

    const shouldScrollToBottom = useRef(true);
    const scrollRef = useRef(null);

    const fetchStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const res = await axiosClient.get('/admin/google/status');
            if (res) {
                setStats(res);
            }
        } catch (error) {
            console.error('Failed to fetch Google status:', error);
        } finally {
            setStatsLoading(false);
        }
    }, []);

    const fetchHistory = useCallback(async (before = null) => {
        if (before) {
            setLoadingMore(true);
            shouldScrollToBottom.current = false;
        } else {
            setLoading(true);
            shouldScrollToBottom.current = true;
        }

        try {
            const limit = 10;
            const beforeParam = before ? `&before=${before}` : '';
            const res = await axiosClient.get(`/admin/google/chat/history?chat_type=support&limit=${limit}${beforeParam}`);

            if (res && Array.isArray(res)) {
                const historyLogs = res.map(log => ({
                    id: log.id,
                    role: log.role === 'model' ? 'ai' : 'user',
                    text: log.content,
                    timestamp: log.timestamp
                }));

                if (before) {
                    const scrollContainer = scrollRef.current;
                    const prevScrollHeight = scrollContainer?.scrollHeight || 0;

                    setMessages(prev => [...historyLogs, ...prev]);

                    // Maintain scroll position after state update
                    requestAnimationFrame(() => {
                        if (scrollContainer) {
                            scrollContainer.scrollTop = scrollContainer.scrollHeight - prevScrollHeight;
                        }
                    });

                    if (historyLogs.length < limit) setHasMore(false);
                } else {
                    if (historyLogs.length > 0) {
                        setMessages(historyLogs);
                        if (historyLogs.length < limit) setHasMore(false);
                    } else {
                        setMessages([{ id: 'welcome', role: 'ai', text: 'Chào sếp! Tôi là Gemini Assistant, tôi có thể giúp gì cho sếp hôm nay?', timestamp: new Date() }]);
                        setHasMore(false);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch chat history:', error);
            if (!before) {
                setMessages([{ id: 'welcome', role: 'ai', text: 'Hệ thống chat hỗ trợ sẵn sàng!', timestamp: new Date() }]);
            }
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    const handleScroll = useCallback(() => {
        if (!scrollRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;

        // Show/hide scroll to bottom button
        setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 300);

        // Load more history when reaching top (with safety margin)
        if (scrollTop <= 10 && !loadingMore && hasMore && messages.length > 0) {
            const oldestMsg = messages.find(m => m.id !== 'welcome');
            if (oldestMsg && oldestMsg.timestamp) {
                fetchHistory(oldestMsg.timestamp);
            }
        }
    }, [loadingMore, hasMore, messages, fetchHistory]);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        fetchStats();
        fetchHistory();
    }, [fetchStats, fetchHistory]);

    useEffect(() => {
        if (scrollRef.current && shouldScrollToBottom.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = useCallback(async (directText = null) => {
        const textToSend = directText || input;
        if (!textToSend.trim()) return;

        const userMsg = { id: Date.now(), role: 'user', text: textToSend, timestamp: new Date() };
        const history = messages.slice(-10).map(m => ({
            role: m.role === 'ai' ? 'model' : 'user',
            content: m.text
        }));

        setMessages(prev => [...prev, userMsg]);
        shouldScrollToBottom.current = true;
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
                text: res || 'Xin lỗi, tôi gặp trục trặc khi xử lý câu hỏi này.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);
            shouldScrollToBottom.current = true;
        } catch (error) {
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'ai',
                text: 'Có lỗi kết nối đến máy chủ AI. Vui lòng thử lại sau.'
            }]);
            shouldScrollToBottom.current = true;
        } finally {
            setLoading(false);
        }
    }, [input, messages]);

    const handleRainSummary = useCallback(async () => {
        const text = 'Tình hình mưa đang như thế nào?';
        setMessages(prev => [...prev, { id: Date.now(), role: 'user', text }]);
        setLoading(true);
        try {
            const res = await axiosClient.get('/admin/google/rain-summary-text');
            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: res || 'Không thể lấy dữ liệu mưa.' }]);
            shouldScrollToBottom.current = true;
        } catch (error) {
            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: 'Lỗi tải dữ liệu.' }]);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleEmailDetail = useCallback(async (emailId) => {
        setLoading(true);
        try {
            const res = await axiosClient.get(`/admin/google/email/${emailId}`);
            if (res) {
                const detail = res;
                let attachmentsText = '';
                if (detail.attachments?.length > 0) {
                    attachmentsText = '\n\n**File đính kèm:**\n' + detail.attachments.map(a => `- [${a.filename}](http://localhost:8089${a.url})`).join('\n');
                }
                const aiMsg = {
                    id: Date.now(),
                    role: 'ai',
                    text: `### ${detail.subject}\n**Từ:** ${detail.from}\n**Ngày:** ${detail.date}\n\n${detail.body}${attachmentsText}`,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, aiMsg]);
                shouldScrollToBottom.current = true;
                fetchStats();
            }
        } catch (error) {
            setLoading(false);
        } finally {
            setLoading(false);
        }
    }, [fetchStats]);

    const handleListEmails = useCallback(async (type) => {
        setLoading(true);
        const url = type === 'recent' ? '/admin/google/emails/recent' : '/admin/google/emails/unread';
        try {
            const res = await axiosClient.get(url);
            if (res) {
                let tableText = `### Danh sách Email\n\n| Người gửi | Tiêu đề | Thời gian | Thao tác |\n| :--- | :--- | :--- | :--- |\n`;
                if (res.length === 0) tableText = 'Không tìm thấy email mới.';
                else res.forEach(m => tableText += `| ${m.from} | ${m.subject} | ${m.date} | [Xem chi tiết](#email-detail-${m.id}) |\n`);
                setMessages(prev => [...prev, { id: Date.now(), role: 'ai', text: tableText }]);
                shouldScrollToBottom.current = true;
            }
        } catch (error) {
            setLoading(false);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleListConstructions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get('/admin/emergency-constructions');
            if (res) {
                const items = res.data || res;
                let tableText = `### Danh sách Công trình khẩn\n\n| Tên công trình | Địa điểm | Trạng thái | Thao tác |\n| :--- | :--- | :--- | :--- |\n`;
                items.forEach(item => tableText += `| ${item.name} | ${item.location} | ${item.status} | [Xem lịch sử](#emc-history-${item.id}) |\n`);
                setMessages(prev => [...prev, { id: Date.now(), role: 'ai', text: tableText }]);
                shouldScrollToBottom.current = true;
            }
        } catch (error) {
            setLoading(false);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleEmcHistory = useCallback(async (id) => {
        setLoading(true);
        try {
            const res = await axiosClient.get(`/admin/emergency-constructions/${id}/progress`);
            if (res) {
                let text = `### Lịch sử thi công\n\n`;
                res.forEach(h => {
                    const date = new Date(h.report_date * 1000).toLocaleString('vi-VN');
                    text += `**Ngày:** ${date}\n**Công việc:** ${h.work_done}\n---\n`;
                });
                setMessages(prev => [...prev, { id: Date.now(), role: 'ai', text }]);
                shouldScrollToBottom.current = true;
            }
        } catch (error) {
            setLoading(false);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleQuickReportText = useCallback(async () => {
        const text = 'Lấy báo cáo nhanh tình hình (Văn bản)';
        setMessages(prev => [...prev, { id: Date.now(), role: 'user', text, timestamp: new Date() }]);
        setLoading(true);
        try {
            const res = await axiosClient.post('/admin/google/quick-report-text');
            if (res) setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: res, timestamp: new Date() }]);
            shouldScrollToBottom.current = true;
        } catch (error) {
            setLoading(false);
        } finally {
            setLoading(false);
        }
    }, [messages]);

    const handleAIDynamicReport = useCallback(async () => {
        const text = 'Tổng hợp tình hình toàn hệ thống (AI)';
        setMessages(prev => [...prev, { id: Date.now(), role: 'user', text, timestamp: new Date() }]);
        setLoading(true);
        try {
            const res = await axiosClient.post('/admin/google/dynamic-report');
            if (res) setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: res, timestamp: new Date() }]);
            shouldScrollToBottom.current = true;
        } catch (error) {
            setLoading(false);
        } finally {
            setLoading(false);
        }
    }, [messages]);

    const handleQuickReport = useCallback(async () => {
        const text = 'Tạo báo cáo nhanh (Word/Google Docs)';
        setMessages(prev => [...prev, { id: Date.now(), role: 'user', text, timestamp: new Date() }]);
        setLoading(true);
        try {
            const res = await axiosClient.post('/admin/google/quick-report');
            if (res && res.report_url) {
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    role: 'ai',
                    text: `### Đã tạo báo cáo nhanh (Word)\n[Mở file Google Docs tại đây](${res.report_url})`,
                    timestamp: new Date()
                }]);
            }
            shouldScrollToBottom.current = true;
        } catch (error) {
            console.error('Failed to generate quick report:', error);
            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: 'Lỗi khi tạo báo cáo Word. Vui lòng thử lại.', timestamp: new Date() }]);
        } finally {
            setLoading(false);
        }
    }, [messages]);

    const handleConstructionReport = useCallback(async (customDate = null) => {
        const dateToUse = customDate !== null ? customDate : reportDate;
        setExporting(true);
        setLoading(true);
        try {
            const res = await axiosClient.get(`/admin/emergency-constructions/export?date=${dateToUse}`);
            if (res) {
                const { url } = res;
                setMessages(prev => [...prev, { id: Date.now(), role: 'ai', text: `### Đã tạo báo cáo công trình\n[Tải về tại đây](${url})` }]);
                setOpenReportDialog(false);
            }
        } catch (error) {
            setLoading(false);
        } finally {
            setExporting(false);
            setLoading(false);
        }
    }, [reportDate]);

    const formatBytes = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const quotaPercentage = useMemo(() => {
        return stats.drive_quota.limit > 0 ? Math.round((stats.drive_quota.usage / stats.drive_quota.limit) * 100) : 0;
    }, [stats.drive_quota]);

    return (
        <Box sx={{
            height: { xs: 'calc(100vh - 64px)', md: 'calc(100vh - 120px)' },
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            position: 'relative',
            bgcolor: '#ffffff', // Set to white background as requested
            borderRadius: { xs: 0, md: '24px' },
            overflow: 'hidden',
            border: { xs: 'none', md: '1px solid' },
            borderColor: 'divider',
            // Safe alignment on mobile
            mx: { xs: '-10px', sm: '-16px', md: 0 },
            mt: { xs: '-20px', sm: '-24px', md: 0 },
            mb: { xs: '-20px', sm: '-24px', md: 0 },
            width: { xs: '100.2%', sm: '100.5%', md: '100%' }
        }}>
            <ChatHeader
                showStats={showStats}
                setShowStats={setShowStats}
                hasPermission={hasPermission}
                handleQuickReportText={handleQuickReportText}
                handleAIDynamicReport={handleAIDynamicReport}
                handleQuickReport={handleQuickReport}
                openReportDialog={() => setOpenReportDialog(true)}
                sx={{ bgcolor: 'white' }}
            />

            <Box
                ref={scrollRef}
                onScroll={handleScroll}
                sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden', // Prevent unintentional horizontal scroll
                    p: { xs: 1, md: 2.5 },
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'transparent',
                    scrollBehavior: 'smooth',
                    '&::-webkit-scrollbar': { width: '6px' },
                    '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                    '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.1)', borderRadius: '10px' }
                }}
            >
                <Box sx={{ minHeight: loadingMore ? '40px' : 0, transition: 'min-height 0.2s' }}>
                    {loadingMore && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                            <CircularProgress size={18} thickness={5} sx={{ color: 'rgba(0,0,0,0.2)' }} />
                        </Box>
                    )}
                </Box>
                {messages.map((msg) => (
                    <MessageItem
                        key={msg.id}
                        msg={msg}
                        userInfo={userInfo}
                        handleEmailDetail={handleEmailDetail}
                        handleEmcHistory={handleEmcHistory}
                    />
                ))}
                {loading && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', mb: 2, width: '100%', px: { xs: 1, md: 2 } }}>
                        <Box sx={{
                            p: '10px 14px',
                            bgcolor: '#E4E6EB',
                            borderRadius: '18px 18px 18px 4px',
                            width: 'fit-content',
                            maxWidth: '90%'
                        }}>
                            {/* <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Đang phân tích...</Typography> */}
                            <CircularProgress size={30} color="inherit" sx={{ ml: 1, opacity: 0.5 }} />
                        </Box>
                    </Box>
                )}
            </Box>

            {/* Input Area */}
            <Box sx={{
                p: { xs: 1, md: 2 },
                bgcolor: 'white',
                borderTop: '1px solid',
                borderColor: 'divider'
            }}>
                <SuggestedQuestions
                    loading={loading}
                    handleRainSummary={handleRainSummary}
                    handleAIDynamicReport={handleAIDynamicReport}
                    handleSendQuestion={handleSend}
                    sx={{ mb: 1, px: 0.5 }}
                />

                <TextField
                    fullWidth
                    size={isMobile ? "small" : "medium"}
                    placeholder="Aa"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    disabled={loading}
                    autoComplete="off"
                    InputProps={{
                        endAdornment: (
                            <IconButton
                                color="primary"
                                onClick={() => handleSend()}
                                disabled={!input.trim() || loading}
                                sx={{ color: '#0084FF' }}
                            >
                                <IconSend size={24} />
                            </IconButton>
                        ),
                        sx: {
                            borderRadius: '22px',
                            bgcolor: '#f0f2f5',
                            px: 2,
                            '& fieldset': { border: 'none' } // Remove border for Messenger look
                        }
                    }}
                />
            </Box>

            {/* Scroll to Bottom Button */}
            <Zoom in={showScrollBottom}>
                <Fab
                    size="small"
                    color="primary"
                    onClick={scrollToBottom}
                    sx={{ position: 'absolute', bottom: 120, right: 30, bgcolor: 'white', color: '#0084FF', '&:hover': { bgcolor: '#f0f2f5' } }}
                >
                    <IconArrowDown size={20} />
                </Fab>
            </Zoom>

            {/* Stats Drawer (for both Mobile & Desktop) */}
            <SwipeableDrawer
                anchor="right"
                open={showStats}
                onClose={() => setShowStats(false)}
                onOpen={() => setShowStats(true)}
                PaperProps={{
                    sx: { width: { xs: '85%', sm: 400 }, p: 0, borderTopLeftRadius: '24px', borderBottomLeftRadius: '24px' }
                }}
            >
                <StatsContent
                    stats={stats}
                    statsLoading={statsLoading}
                    fetchStats={fetchStats}
                    formatBytes={formatBytes}
                    quotaPercentage={quotaPercentage}
                    handleListEmails={handleListEmails}
                    handleListConstructions={handleListConstructions}
                />
            </SwipeableDrawer>

            {/* Report Dialog */}
            <Dialog open={openReportDialog} onClose={() => !exporting && setOpenReportDialog(false)} PaperProps={{ sx: { borderRadius: '16px', minWidth: 320 } }}>
                <DialogTitle sx={{ fontWeight: 800 }}>Xuất báo cáo công trình</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        type="date"
                        label="Chọn ngày"
                        value={reportDate}
                        onChange={(e) => setReportDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenReportDialog(false)} disabled={exporting}>Hủy</Button>
                    <Button variant="contained" onClick={() => handleConstructionReport()} disabled={exporting}>
                        {exporting ? 'Đang xuất...' : 'Xuất báo cáo'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AiSupport;
