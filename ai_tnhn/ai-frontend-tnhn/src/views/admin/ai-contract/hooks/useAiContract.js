import { useState, useEffect, useRef } from 'react';
import contractApi from 'api/contract';
import useAuthStore from 'store/useAuthStore';
import { useNavigate } from 'react-router-dom';

export const useAiContract = () => {
    const { user: userInfo } = useAuthStore();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);
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

    return {
        userInfo,
        messages,
        input,
        setInput,
        loading,
        scrollRef,
        navigate,
        handleSend,
        handleSendQuestion
    };
};
