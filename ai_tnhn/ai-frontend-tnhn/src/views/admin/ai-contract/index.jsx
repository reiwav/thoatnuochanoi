import React from 'react';
import { Box, Typography, Avatar, CircularProgress, Paper, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconRobot } from '@tabler/icons-react';

// Hook
import { useAiContract } from './hooks/useAiContract';

// Components
import MessageItem from './components/MessageItem';
import SuggestedQuestions from './components/SuggestedQuestions';
import ChatInput from './components/ChatInput';

const AiContract = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    const {
        userInfo,
        messages,
        input,
        setInput,
        loading,
        scrollRef,
        navigate,
        handleSend,
        handleSendQuestion
    } = useAiContract();

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
                        <MessageItem key={msg.id} msg={msg} userInfo={userInfo} navigate={navigate} />
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
                <SuggestedQuestions loading={loading} handleSendQuestion={handleSendQuestion} />

                {/* Input Area */}
                <ChatInput input={input} setInput={setInput} handleSend={handleSend} loading={loading} />
            </Box>
        </Box>
    );
};

export default AiContract;
