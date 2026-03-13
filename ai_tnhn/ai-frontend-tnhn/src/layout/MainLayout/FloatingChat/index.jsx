import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '@mui/material/styles';
import {
    Fab, Tooltip, IconButton, Drawer, Box, Typography, Stack,
    Avatar, TextField, CircularProgress, Paper, Divider
} from '@mui/material';
import { IconMessages, IconX, IconSend, IconRobot, IconUser } from '@tabler/icons-react';
import AnimateButton from 'ui-component/extended/AnimateButton';
import axiosClient from 'api/axiosClient';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const FloatingChat = () => {
    const theme = useTheme();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, role: 'ai', text: 'Chào Sếp! Tôi là HSDC AI. Hôm nay sếp muốn kiểm tra thông tin gì ạ?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, open]);

    const handleToggle = () => setOpen(!open);

    const handleSend = async () => {
        const textToSend = input.trim();
        if (!textToSend) return;

        const userMsg = { id: Date.now(), role: 'user', text: textToSend };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        const history = messages.map(m => ({
            role: m.role === 'ai' ? 'model' : 'user',
            content: m.text
        }));

        try {
            const res = await axiosClient.post('/admin/google/chat', {
                prompt: textToSend,
                history: history
            });
            const aiMsg = {
                id: Date.now() + 1,
                role: 'ai',
                text: res.data?.data || 'Xin lỗi sếp, tôi gặp chút trục trặc.'
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error('Chat failed:', error);
            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: 'Có lỗi kết nối. Vui lòng thử lại sau.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Tooltip title="AI Support Chat">
                <Fab
                    component="div"
                    onClick={handleToggle}
                    size="medium"
                    variant="circular"
                    color="secondary"
                    sx={{
                        borderRadius: 0,
                        borderTopLeftRadius: '50%',
                        borderBottomLeftRadius: '50%',
                        borderTopRightRadius: '50%',
                        borderBottomRightRadius: '4px',
                        top: 'calc(25% + 60px)',
                        position: 'fixed',
                        right: 10,
                        zIndex: 1200,
                        boxShadow: theme.vars?.customShadows?.secondary || theme.customShadows?.secondary || theme.shadows[10]
                    }}
                >
                    <AnimateButton type="rotate">
                        <IconButton color="inherit" size="large" disableRipple>
                            {open ? <IconX /> : <IconMessages />}
                        </IconButton>
                    </AnimateButton>
                </Fab>
            </Tooltip>

            <Drawer
                anchor="right"
                onClose={handleToggle}
                open={open}
                PaperProps={{
                    sx: {
                        width: { xs: '100%', sm: 400 },
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                    }
                }}
            >
                {/* Header */}
                <Box sx={{ p: 2.5, bgcolor: 'primary.main', color: 'white' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar sx={{ bgcolor: 'white', color: 'primary.main' }}>
                                <IconRobot size={24} />
                            </Avatar>
                            <Box>
                                <Typography variant="h5" color="inherit" fontWeight={800}>HSDC AI Assistant</Typography>
                                <Typography variant="caption" color="inherit" sx={{ opacity: 0.8 }}>Dành cho Super Admin</Typography>
                            </Box>
                        </Stack>
                        <IconButton color="inherit" onClick={handleToggle}>
                            <IconX size={20} />
                        </IconButton>
                    </Stack>
                </Box>

                {/* Messages container */}
                <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden', bgcolor: '#f4f6f8' }}>
                    <Box ref={scrollRef} sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, p: 2, overflowY: 'auto' }}>
                        <Stack spacing={2}>
                            {messages.map((msg) => (
                                <Box key={msg.id} sx={{ display: 'flex', gap: 1, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                                    <Avatar sx={{ width: 28, height: 28, bgcolor: msg.role === 'user' ? 'primary.light' : 'secondary.light' }}>
                                        {msg.role === 'user' ? <IconUser size={16} /> : <IconRobot size={16} />}
                                    </Avatar>
                                    <Paper sx={{
                                        p: 1.5,
                                        borderRadius: msg.role === 'user' ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
                                        maxWidth: '80%',
                                        bgcolor: msg.role === 'user' ? 'primary.main' : 'white',
                                        color: msg.role === 'user' ? 'white' : 'text.primary',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                        '& p': { m: 0 }
                                    }}>
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                                    </Paper>
                                </Box>
                            ))}
                            {loading && (
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Avatar sx={{ width: 28, height: 28, bgcolor: 'secondary.light' }}>
                                        <IconRobot size={16} />
                                    </Avatar>
                                    <Paper sx={{ p: 1.5, borderRadius: '2px 12px 12px 12px', bgcolor: 'white' }}>
                                        <CircularProgress size={16} />
                                    </Paper>
                                </Box>
                            )}
                        </Stack>
                    </Box>
                </Box>

                <Divider />

                {/* Input Area */}
                <Box sx={{ p: 2, bgcolor: 'white' }}>
                    <TextField
                        fullWidth
                        placeholder="Nhập câu hỏi của bạn..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        disabled={loading}
                        autoComplete="off"
                        InputProps={{
                            endAdornment: (
                                <IconButton color="primary" onClick={handleSend} disabled={!input.trim() || loading}>
                                    <IconSend size={20} />
                                </IconButton>
                            ),
                            sx: { borderRadius: 3, bgcolor: '#f8fafc' }
                        }}
                    />
                </Box>
            </Drawer>
        </>
    );
};

export default FloatingChat;
