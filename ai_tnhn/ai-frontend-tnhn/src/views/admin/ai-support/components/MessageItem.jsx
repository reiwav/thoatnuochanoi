import React, { memo } from 'react';
import { Box, Typography, Paper, Tooltip, IconButton } from '@mui/material';
import { IconRobot, IconUser, IconMail, IconBolt, IconChartBar } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import AiTable from './tables/AiTable';
// ... (giữ nguyên các phần import)

const MessageItem = memo(({ msg, userInfo, handleEmailDetail, handleEmcHistory, handleRainChart }) => {
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
                mb: 0.2,
                width: '100%',
                px: { xs: 1, md: 2 }
            }}>
                <Paper sx={{
                    p: { xs: '8px 12px', md: '12px 18px' },
                    borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    width: 'fit-content',
                    maxWidth: isUser ? { xs: '90%', sm: '80%', md: '70%' } : { xs: '92%', sm: '88%', md: '80%' },
                    bgcolor: isUser ? '#0084FF' : '#f0f2f5',
                    color: isUser ? 'white' : 'black',
                    boxShadow: 'none',
                    border: 'none',
                    position: 'relative',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    fontSize: { xs: '0.95rem', md: '0.935rem' },
                    lineHeight: 1.4
                }}>
                    <Box sx={{
                        '& p': { m: 0, '&:not(:last-child)': { mb: 1 } }, // Giảm margin bottom của đoạn văn
                        '& a': { color: isUser ? 'white' : '#0084FF', textDecoration: 'underline' },
                        '& table': {
                            width: '100%',
                            borderCollapse: 'collapse',
                            my: 1, // Giảm khoảng cách trên dưới của bảng (từ 1.5 xuống 1)
                            fontSize: '12px', // Giảm nhẹ font size để tối ưu không gian
                            border: '1px solid',
                            borderColor: isUser ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                            borderRadius: '4px',
                            overflow: 'hidden'
                        },
                        '& th, & td': {
                            p: '4px 8px', // Thu hẹp padding (từ 8px xuống còn 4px dọc, 8px ngang)
                            border: '1px solid',
                            borderColor: isUser ? 'rgba(255,255,255,0.2)' : 'divider',
                            textAlign: 'left',
                            lineHeight: 1.2 // Giảm line-height trong cell
                        },
                        '& th': { bgcolor: isUser ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', fontWeight: 700 },
                        '& ul, & ol': {
                            pl: { xs: 2.5, md: 3 },
                            my: 1,
                            '& li': { mb: 0.5 }
                        },
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
                                    return <AiTable key={key} title={key} data={data} tableKey={key} handleRainChart={handleRainChart} />;
                                }
                                if (typeof data === 'object' && data !== null) {
                                    return Object.entries(data).map(([subKey, subData]) => {
                                        if (Array.isArray(subData)) {
                                            return <AiTable key={`${key}-${subKey}`} title={`${key} - ${subKey}`} data={subData} tableKey={key} handleRainChart={handleRainChart} />;
                                        }
                                        return null;
                                    });
                                }
                                return null;
                            };

                            const content = parts.map((part, index) => {
                                const match = part.match(/^\[TABLE:([a-zA-Z0-9_]+)\]$/);
                                if (match) {
                                    return <Box key={index} sx={{ my: 0.5 }}>{renderTable(match[1])}</Box>;
                                }
                                if (!part.trim()) return null;
                                return (
                                    <ReactMarkdown
                                        key={index}
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            table: ({ node, ...props }) => <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '0.5rem', border: `1px solid ${isUser ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}` }} {...props} />,
                                            th: ({ node, ...props }) => <th style={{ border: `1px solid ${isUser ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`, padding: '4px 8px', backgroundColor: isUser ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', textAlign: 'left' }} {...props} />,
                                            td: ({ node, ...props }) => <td style={{ border: `1px solid ${isUser ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`, padding: '4px 8px' }} {...props} />,
                                            p: ({ node, ...props }) => <p style={{ margin: '0 0 0.4rem 0', wordBreak: 'break-word' }} {...props} />,
                                            // ... (giữ nguyên các phần logic component a/IconButton phía dưới)
                                            a: ({ node, ...props }) => {
                                                if (props.href && props.href.startsWith('#rain-chart-')) {
                                                    const parts = props.href.replace('#rain-chart-', '').split('-');
                                                    const stationId = parts[0];
                                                    const date = parts.slice(1).join('-');
                                                    return (
                                                        <Box component="span" sx={{ display: 'inline-block', my: 0.5 }}>
                                                            <Tooltip title="Xem biểu đồ lượng mưa">
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
                                                                        handleRainChart(stationId, date);
                                                                    }}
                                                                >
                                                                    <IconChartBar size={14} />
                                                                    <Typography variant="caption" fontWeight={700} sx={{ color: 'inherit' }}>{props.children}</Typography>
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    );
                                                }
                                                if (props.href && props.href.startsWith('#email-detail-')) {
                                                    const emailId = props.href.replace('#email-detail-', '');
                                                    return (
                                                        <Box component="span" sx={{ display: 'inline-block', my: 0.5 }}>
                                                            <Tooltip title="Xem chi tiết email">
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
                                        {part}
                                    </ReactMarkdown>
                                );
                            });

                            return (
                                <>
                                    {content}
                                    {msg.tables && Object.keys(msg.tables).map(key => {
                                        if (!renderedKeys.has(key)) {
                                            return <Box key={`extra-${key}`} sx={{ mt: 1 }}>{renderTable(key)}</Box>;
                                        }
                                        return null;
                                    })}
                                </>
                            );
                        })()}
                    </Box>
                    {/* ... (phần timestamp giữ nguyên) */}
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