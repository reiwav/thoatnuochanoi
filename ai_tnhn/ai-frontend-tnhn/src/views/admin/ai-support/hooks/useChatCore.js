import { useState, useEffect, useRef, useCallback } from 'react';
import axiosClient from 'api/axiosClient';

export const useChatCore = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [showScrollBottom, setShowScrollBottom] = useState(false);

    const shouldScrollToBottom = useRef(true);
    const scrollRef = useRef(null);

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
                            // ignore, fallback to text
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
        fetchHistory();
    }, [fetchHistory]);

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
                } catch (e) {
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

    return {
        messages,
        setMessages,
        input,
        setInput,
        loading,
        setLoading,
        hasMore,
        loadingMore,
        showScrollBottom,
        shouldScrollToBottom,
        scrollRef,
        handleScroll,
        scrollToBottom,
        handleSend,
        fetchHistory
    };
};

export default useChatCore;
