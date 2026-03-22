import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, User, Sparkles, Loader2, Minimize2, Maximize2 } from 'lucide-react';
import axios from 'axios';
import './ChatAI.css';

const API_BASE_URL = '/api'; // Standard prefix for this project

export default function ChatAI() {
  const [messages, setMessages] = useState([
    { role: 'model', content: 'Xin chào! Tôi là Gemini. Tôi có thể giúp gì cho bạn về dữ liệu cảm biến và các cảnh báo?', time: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await axios.post(`${API_BASE_URL}/ai/chat`, {
        history: history,
        message: input
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('SENSOR_TOKEN')}` // Correct token name
        }
      });

      const aiMsg = { role: 'model', content: response.data.message, time: new Date() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      setMessages(prev => [...prev, { 
        role: 'model', 
        content: `Đã có lỗi xảy ra: ${errorMsg}. Vui lòng kiểm tra lại cấu hình Gemini Token hoặc kết nối mạng.`, 
        time: new Date() 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-ai-container">
      <div className="chat-header">
        <div className="ai-info">
          <div className="ai-avatar pulse">
            <Sparkles size={20} color="#fff" />
          </div>
          <div>
            <h3>Gemini AI Support</h3>
            <span className="ai-status">Ready to assist</span>
          </div>
        </div>
        <div className="chat-actions">
          <button className="chat-btn"><Minimize2 size={16} /></button>
        </div>
      </div>

      <div className="messages-list" ref={scrollRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`message-wrapper ${msg.role}`}>
            <div className="message-icon">
              {msg.role === 'user' ? <User size={18} /> : <Sparkles size={18} />}
            </div>
            <div className="message-bubble gradient-border">
              <div className="message-content">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
              <div className="message-time">
                {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="message-wrapper model loading">
            <div className="message-icon pulse">
              <Sparkles size={18} />
            </div>
            <div className="message-bubble">
              <Loader2 className="animate-spin" size={20} />
              <span>Gemini is thinking...</span>
            </div>
          </div>
        )}
      </div>

      <div className="chat-input-area">
        <div className="input-container">
          <input 
            type="text" 
            placeholder="Ask me anything about stations, alarms, or sensor history..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            className={`send-btn ${input.trim() ? 'active' : ''}`} 
            onClick={handleSend}
            disabled={loading || !input.trim()}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
