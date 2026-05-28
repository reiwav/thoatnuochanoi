import React from 'react';
import { Box, Paper, Avatar, Tooltip, Typography, IconButton } from '@mui/material';
import { IconRobot, IconUser, IconEye } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dayjs from 'dayjs';
import AiTable from './AiTable';

const MessageItem = ({ msg, userInfo, navigate }) => {
    const isUser = msg.role === 'user';

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
        <Box sx={{
            display: 'flex',
            gap: 2,
            flexDirection: isUser ? 'row-reverse' : 'row',
            alignItems: 'flex-start'
        }}>
            <Avatar sx={{
                bgcolor: isUser ? 'primary.light' : 'secondary.light',
                color: isUser ? 'primary.main' : 'secondary.main',
                width: 32, height: 32,
                fontSize: '0.875rem', fontWeight: 700
            }}>
                {isUser ? (userInfo?.name?.charAt(0) || <IconUser size={18} />) : <IconRobot size={18} />}
            </Avatar>
            <Paper sx={{
                p: 2,
                borderRadius: isUser ? '20px 4px 20px 20px' : '4px 20px 20px 20px',
                maxWidth: '85%',
                bgcolor: isUser ? 'primary.main' : '#f8fafc',
                color: isUser ? 'white' : 'text.primary',
                boxShadow: 'none',
                border: isUser ? 'none' : '1px solid #e2e8f0',
                position: 'relative'
            }}>
                <Box sx={{
                    '& p': { m: 0, '&:not(:last-child)': { mb: 1.5 } },
                    '& a': { color: isUser ? 'white' : 'primary.main', textDecoration: 'underline' },
                    '& table': {
                        width: '100%',
                        borderCollapse: 'collapse',
                        my: 1.5,
                        fontSize: '13px',
                        border: '1px solid',
                        borderColor: isUser ? 'rgba(255,255,255,0.2)' : 'divider'
                    },
                    '& th, & td': {
                        p: 1,
                        border: '1px solid',
                        borderColor: isUser ? 'rgba(255,255,255,0.2)' : 'divider',
                        textAlign: 'left'
                    },
                    '& th': { bgcolor: isUser ? 'rgba(255,255,255,0.1)' : '#f1f5f9', fontWeight: 700 },
                    '& ul, & ol': { pl: 2, my: 1 },
                    '& li': { mb: 0.5 }
                }}>
                    {content}
                    {unrenderedTables.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                            {unrenderedTables.map(key => renderTable(key))}
                        </Box>
                    )}
                </Box>
                {msg.timestamp && (
                    <Typography
                        variant="caption"
                        sx={{
                            display: 'block',
                            mt: 0.5,
                            textAlign: isUser ? 'right' : 'left',
                            opacity: 0.7,
                            fontSize: '10px',
                            color: isUser ? 'rgba(255,255,255,0.8)' : 'text.secondary'
                        }}
                    >
                        {dayjs(msg.timestamp).fromNow()} ({dayjs(msg.timestamp).format('HH:mm')})
                    </Typography>
                )}
            </Paper>
        </Box>
    );
};

export default MessageItem;
