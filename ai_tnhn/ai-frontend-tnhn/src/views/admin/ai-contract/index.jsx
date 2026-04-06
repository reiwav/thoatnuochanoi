import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, TextField, IconButton, Paper, Avatar, CircularProgress, Tooltip, useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconSend, IconRobot, IconUser, IconClipboardList, IconEye } from '@tabler/icons-react';
import contractApi from 'api/contract';
import useAuthStore from 'store/useAuthStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');


const AiContract = () => {
    const { user: userInfo } = useAuthStore();
    const [messages, setMessages] = useState([]);

    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate();

    const fetchHistory = async () => {
        try {
            console.log('Fetching contract chat history...');
            const res = await contractApi.getChatHistory('contract', 50);
            console.log('Contract chat history response:', res.data);
            if (res.data?.status === 'success' && Array.isArray(res.data.data)) {
                const historyLogs = res.data.data.map(log => ({
                    id: log.id,
                    role: log.role === 'model' ? 'ai' : 'user',
                    text: log.content,
                    timestamp: log.timestamp
                }));
                if (historyLogs.length > 0) {
                    setMessages(historyLogs);
                } else {
                    setMessages([{ id: 'welcome', role: 'ai', text: 'Xin chào, tôi là trợ lý AI quản lý hợp đồng. Bạn cần tôi giúp gì?', timestamp: new Date() }]);
                }
            }
        } catch (error) {
            console.error('Failed to fetch contract chat history:', error);
            setMessages([{ id: 'welcome', role: 'ai', text: 'Xin chào, tôi là trợ lý AI quản lý hợp đồng. Bạn cần tôi giúp gì?', timestamp: new Date() }]);
        }
    };


    useEffect(() => {
        fetchHistory();
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);


    const handleSend = async (directText = null) => {
        const textToSend = directText || input;
        if (!textToSend.trim()) return;

        const userMsg = { id: Date.now(), role: 'user', text: textToSend, timestamp: new Date() };
        const history = messages.map(m => ({
            role: m.role === 'ai' ? 'model' : 'user',
            content: m.text
        }));


        setMessages(prev => [...prev, userMsg]);
        if (!directText) setInput('');
        setLoading(true);

        try {
            const res = await contractApi.chatContract({
                prompt: textToSend,
                history: history
            });
            const aiMsg = {
                id: Date.now() + 1,
                role: 'ai',
                text: res.data?.data || 'Xin lỗi, tôi gặp trục trặc khi xử lý câu hỏi này.',
                timestamp: new Date()
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

    return (
        <Box sx={{ height: 'calc(100vh - 140px)', display: 'flex', gap: isMobile ? 0 : 3, position: 'relative' }}>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
                {/* Chat Header */}
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                            <IconRobot size={24} />
                        </Avatar>
                        <Box>
                            <Typography variant="h4" fontWeight={800}>AI Hợp đồng</Typography>
                            <Typography variant="caption" color="text.secondary">Trợ lý quản lý hợp đồng</Typography>
                        </Box>
                    </Box>
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
                                width: 32, height: 32,
                                fontSize: '0.875rem', fontWeight: 700
                            }}>
                                {msg.role === 'user' ? (userInfo?.name?.charAt(0) || <IconUser size={18} />) : <IconRobot size={18} />}
                            </Avatar>
                            <Paper sx={{
                                p: 2,
                                borderRadius: msg.role === 'user' ? '20px 4px 20px 20px' : '4px 20px 20px 20px',
                                maxWidth: '85%',
                                bgcolor: msg.role === 'user' ? 'primary.main' : '#f8fafc',
                                color: msg.role === 'user' ? 'white' : 'text.primary',
                                boxShadow: 'none',
                                borderColor: msg.role === 'ai' ? '1px solid #e2e8f0' : 'none',
                                position: 'relative'
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
                                                if (props.href && props.href.startsWith('#contract-detail-')) {
                                                    const contractId = props.href.replace('#contract-detail-', '');
                                                    return (
                                                        <Box component="span" sx={{ display: 'inline-block', my: 0.5 }}>
                                                            <Tooltip title="Xem chi tiết hợp đồng này">
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
                                                                        navigate(`/admin/contract?id=${contractId}`);
                                                                    }}
                                                                >
                                                                    <IconEye size={14} />
                                                                    <Typography variant="caption" fontWeight={700} sx={{ color: 'inherit' }}>
                                                                        Xem chi tiết
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
                                {msg.timestamp && (
                                    <Typography 
                                        variant="caption" 
                                        sx={{ 
                                            display: 'block', 
                                            mt: 0.5, 
                                            textAlign: msg.role === 'user' ? 'right' : 'left',
                                            opacity: 0.7,
                                            fontSize: '10px',
                                            color: msg.role === 'user' ? 'rgba(255,255,255,0.8)' : 'text.secondary'
                                        }}
                                    >
                                        {dayjs(msg.timestamp).fromNow()} ({dayjs(msg.timestamp).format('HH:mm')})
                                    </Typography>
                                )}
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
                {!loading && (
                    <Box sx={{ px: 3, pb: 2, display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                        {[
                            'Tổng quan hợp đồng hiện tại?',
                            'Hợp đồng nào sắp hết hạn?',
                            'Hợp đồng đã hết hạn?',
                            'Giai đoạn thanh toán sắp đến hạn?',
                            'Giai đoạn thanh toán đã quá hạn?',
                        ].map((text, i) => (
                            <Paper
                                key={i}
                                onClick={() => handleSendQuestion(text)}
                                sx={{
                                    px: 2, py: 1, borderRadius: '12px', cursor: 'pointer',
                                    border: '1px solid', borderColor: 'primary.200',
                                    color: 'primary.main', fontSize: '13px', fontWeight: 600,
                                    transition: 'all 0.2s',
                                    '&:hover': { bgcolor: 'primary.light', borderColor: 'primary.main' }
                                }}
                            >
                                {text}
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
                                <IconButton color="primary" onClick={() => handleSend()} disabled={!input.trim() || loading}>
                                    <IconSend size={24} />
                                </IconButton>
                            ),
                            sx: { borderRadius: '16px', bgcolor: '#f8fafc', p: '4px 8px' }
                        }}
                    />
                </Box>
            </Box>
        </Box>
    );
};

export default AiContract;
