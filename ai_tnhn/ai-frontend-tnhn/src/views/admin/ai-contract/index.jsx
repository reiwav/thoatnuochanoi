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

const AiTable = ({ title, data }) => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    const columns = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object' && k !== 'id' && k !== 'old_id');
    
    const formatHeader = (key) => {
        const nameMap = {
            'name': 'Tên hợp đồng', 'amount': 'Giá trị', 'status': 'Trạng thái',
            'start_date': 'Ngày bắt đầu', 'end_date': 'Ngày kết thúc', 'contract_no': 'Số HĐ',
            'partner': 'Đối tác', 'progress': 'Tiến độ'
        };
        return nameMap[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
    };
    
    return (
        <Box sx={{ my: 2, width: '100%' }}>
            {title && <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, textTransform: 'uppercase', fontSize: '12px', opacity: 0.8 }}>{title}</Typography>}
            <Box sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: '8px', bgcolor: 'background.paper' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead style={{ backgroundColor: 'rgba(0,0,0,0.04)' }}>
                        <tr>
                            {columns.map(col => <th key={col} style={{ padding: '10px', borderBottom: '1px solid rgba(0,0,0,0.1)', textAlign: 'left', fontWeight: 600, color: '#333' }}>{formatHeader(col)}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', backgroundColor: 'transparent' }}>
                                {columns.map(col => (
                                    <td key={col} style={{ padding: '8px 10px', color: '#000' }}>
                                        {typeof row[col] === 'boolean' ? (row[col] ? 'Có' : 'Không') : row[col]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Box>
        </Box>
    );
};

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
            const res = await contractApi.getChatHistory('contract', 3);
            if (res && Array.isArray(res)) {
                const historyLogs = res.map(log => {
                    let text = log.content;
                    let tables = null;
                    if (log.role === 'model') {
                        try {
                            const parsed = JSON.parse(log.content);
                            if (parsed && typeof parsed === 'object' && parsed.text) {
                                text = parsed.text;
                                tables = parsed.tables;
                            }
                        } catch (e) {
                            // ignore
                        }
                    }
                    return {
                        id: log.id,
                        role: log.role === 'model' ? 'ai' : 'user',
                        text: text,
                        tables: tables,
                        timestamp: log.timestamp
                    };
                });
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
            let text = 'Xin lỗi, tôi gặp trục trặc khi xử lý câu hỏi này.';
            let tables = null;
            if (res && typeof res === 'object' && res.text) {
                text = res.text;
                tables = res.tables;
            } else if (typeof res === 'string') {
                try {
                    const parsed = JSON.parse(res);
                    if (parsed && parsed.text) {
                        text = parsed.text;
                        tables = parsed.tables;
                    } else {
                        text = res;
                    }
                } catch(e) {
                    text = res;
                }
            }

            const aiMsg = {
                id: Date.now() + 1,
                role: 'ai',
                text: text,
                tables: tables,
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

                                    {(() => {
                                        const rawText = typeof msg.text === 'string' ? msg.text : JSON.stringify(msg.text);
                                        const parts = rawText.split(/(\[TABLE:[a-zA-Z0-9_]+\])/g);
                                        const renderedKeys = new Set();
                                        
                                        const renderTable = (key) => {
                                            if (!msg.tables || !msg.tables[key]) return null;
                                            renderedKeys.add(key);
                                            const data = msg.tables[key];
                                            if (Array.isArray(data)) {
                                                return <AiTable key={key} title={key} data={data} />;
                                            }
                                            if (typeof data === 'object' && data !== null) {
                                                return Object.entries(data).map(([subKey, subData]) => {
                                                    if (Array.isArray(subData)) {
                                                        return <AiTable key={`${key}-${subKey}`} title={`${key} - ${subKey}`} data={subData} />;
                                                    }
                                                    return null;
                                                });
                                            }
                                            return null;
                                        };

                                        const content = parts.map((part, index) => {
                                            const match = part.match(/^\[TABLE:([a-zA-Z0-9_]+)\]$/);
                                            if (match) {
                                                return <Box key={index} sx={{ my: 2 }}>{renderTable(match[1])}</Box>;
                                            }
                                            if (!part.trim()) return null;
                                            return (
                                                <ReactMarkdown
                                                    key={index}
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        table: ({ node, ...props }) => <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '1rem', border: `1px solid ${isUser ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}` }} {...props} />,
                                                        th: ({ node, ...props }) => <th style={{ border: `1px solid ${isUser ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`, padding: '8px', backgroundColor: isUser ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', textAlign: 'left' }} {...props} />,
                                                        td: ({ node, ...props }) => <td style={{ border: `1px solid ${isUser ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`, padding: '8px' }} {...props} />,
                                                        p: ({ node, ...props }) => <p style={{ margin: '0 0 0.5rem 0', wordBreak: 'break-word' }} {...props} />,
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
                                                    {part}
                                                </ReactMarkdown>
                                            );
                                        });

                                        const unrenderedTables = msg.tables && typeof msg.tables === 'object' 
                                            ? Object.keys(msg.tables).filter(key => !renderedKeys.has(key)) 
                                            : [];

                                        return (
                                            <>
                                                {content}
                                                {unrenderedTables.length > 0 && (
                                                    <Box sx={{ mt: 2 }}>
                                                        {unrenderedTables.map(key => renderTable(key))}
                                                    </Box>
                                                )}
                                            </>
                                        );
                                    })()}
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
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <IconButton color="primary" onClick={() => handleSend()} disabled={!input.trim() || loading}>
                                        <IconSend size={24} />
                                    </IconButton>
                                ),
                                sx: { borderRadius: '16px', bgcolor: '#f8fafc', p: '4px 8px' }
                            }
                        }}
                    />
                </Box>
            </Box>
        </Box>
    );
};

export default AiContract;
