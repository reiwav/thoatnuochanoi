import React, { memo } from 'react';
import { Box, Typography, Paper, Tooltip, IconButton } from '@mui/material';
import { IconRobot, IconUser, IconMail, IconBolt } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';

const MessageItem = memo(({ msg, userInfo, handleEmailDetail, handleEmcHistory }) => {
    const isUser = msg.role === 'user';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
        >
            <Box sx={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                mb: 1.5, // Messenger has tighter spacing
                width: '100%',
                px: { xs: 1, md: 2 }
            }}>
                <Paper sx={{
                    p: { xs: '10px 14px', md: '12px 18px' },
                    borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    width: 'fit-content',
                    maxWidth: isUser ? { xs: '85%', sm: '75%', md: '70%' } : { xs: '85%', sm: '85%', md: '80%' },
                    bgcolor: isUser ? '#0084FF' : '#E4E6EB',
                    color: isUser ? 'white' : 'black',
                    boxShadow: 'none', // Messenger doesn't use heavy shadows
                    border: 'none',
                    position: 'relative',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    fontSize: { xs: '0.95rem', md: '1rem' },
                    lineHeight: 1.5
                }}>
                    <Box sx={{
                        '& p': { m: 0, '&:not(:last-child)': { mb: 1.5 } },
                        '& a': { color: isUser ? 'white' : '#0084FF', textDecoration: 'underline' },
                        '& table': {
                            width: '100%',
                            borderCollapse: 'collapse',
                            my: 1.5,
                            fontSize: '13px',
                            border: '1px solid',
                            borderColor: isUser ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                            borderRadius: '8px',
                            overflow: 'hidden'
                        },
                        '& th, & td': {
                            p: 1,
                            border: '1px solid',
                            borderColor: isUser ? 'rgba(255,255,255,0.2)' : 'divider',
                            textAlign: 'left'
                        },
                        '& th': { bgcolor: isUser ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', fontWeight: 700 },
                        '& ul, & ol': { 
                            pl: { xs: 2.5, md: 3 }, 
                            my: 1,
                            '& li': { mb: 0.5 }
                        },
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
                                                            bgcolor: isUser ? 'rgba(255,255,255,0.1)' : 'rgba(0, 132, 255, 0.1)',
                                                            '&:hover': { bgcolor: isUser ? 'rgba(255,255,255,0.2)' : '#0084FF', color: 'white' },
                                                            borderRadius: '8px',
                                                            gap: 0.5, px: 1.5, height: '32px'
                                                        }}
                                                        onClick={(e) => {
                                                            e?.preventDefault();
                                                            handleEmailDetail(emailId);
                                                        }}
                                                    >
                                                        <IconMail size={14} />
                                                        <Typography variant="caption" fontWeight={700} sx={{ color: 'inherit' }}>Xem chi tiết</Typography>
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
                                                            bgcolor: isUser ? 'rgba(255,255,255,0.1)' : 'rgba(255, 152, 0, 0.1)',
                                                            '&:hover': { bgcolor: '#ff9800', color: 'white' },
                                                            borderRadius: '8px',
                                                            gap: 0.5, px: 1.5, height: '32px'
                                                        }}
                                                        onClick={(e) => {
                                                            e?.preventDefault();
                                                            handleEmcHistory(emcId);
                                                        }}
                                                    >
                                                        <IconBolt size={14} />
                                                        <Typography variant="caption" fontWeight={700} sx={{ color: 'inherit' }}>Xem lịch sử</Typography>
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        );
                                    }
                                    return <a {...props} target="_blank" rel="noopener noreferrer" style={{ color: isUser ? '#fff' : '#0084FF', fontWeight: 600 }} />;
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
                                textAlign: 'right',
                                opacity: 0.5,
                                fontSize: '10px',
                                color: isUser ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.5)'
                            }}
                        >
                            {dayjs(msg.timestamp).format('HH:mm')}
                        </Typography>
                    )}
                </Paper>
            </Box>
        </motion.div>
    );
});

export default MessageItem;
