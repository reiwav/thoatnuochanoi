import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom hook for managing WebSocket connection
 * @param {string} url - WebSocket URL
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoConnect - Auto-connect on mount (default: true)
 * @param {number} options.reconnectInterval - Reconnection interval in ms (default: 3000)
 * @param {number} options.maxReconnectAttempts - Max reconnection attempts (default: 5)
 * @param {Function} options.onMessage - Callback for incoming messages
 * @param {Function} options.onOpen - Callback when connection opens
 * @param {Function} options.onClose - Callback when connection closes
 * @param {Function} options.onError - Callback for errors
 */
const useWebSocket = (url, options = {}) => {
    const {
        autoConnect = true,
        reconnectInterval = 3000,
        maxReconnectAttempts = 5,
        onMessage,
        onOpen,
        onClose,
        onError
    } = options;

    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState(null);
    const [reconnectCount, setReconnectCount] = useState(0);

    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const shouldReconnectRef = useRef(true);

    const connect = useCallback(() => {
        if (!url || wsRef.current?.readyState === WebSocket.OPEN) return;

        try {
            const ws = new WebSocket(url);

            ws.onopen = (event) => {
                console.log('[WebSocket] Connected to', url);
                setIsConnected(true);
                setReconnectCount(0);
                onOpen?.(event);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    setLastMessage(data);
                    onMessage?.(data);
                } catch (err) {
                    console.error('[WebSocket] Failed to parse message:', err);
                    setLastMessage(event.data);
                    onMessage?.(event.data);
                }
            };

            ws.onclose = (event) => {
                console.log('[WebSocket] Disconnected:', event.code, event.reason);
                setIsConnected(false);
                wsRef.current = null;
                onClose?.(event);

                // Auto-reconnect logic
                if (shouldReconnectRef.current && reconnectCount < maxReconnectAttempts) {
                    console.log(`[WebSocket] Reconnecting in ${reconnectInterval}ms... (Attempt ${reconnectCount + 1}/${maxReconnectAttempts})`);
                    reconnectTimeoutRef.current = setTimeout(() => {
                        setReconnectCount(prev => prev + 1);
                        connect();
                    }, reconnectInterval);
                }
            };

            ws.onerror = (event) => {
                console.error('[WebSocket] Error:', event);
                onError?.(event);
            };

            wsRef.current = ws;
        } catch (err) {
            console.error('[WebSocket] Connection error:', err);
            onError?.(err);
        }
    }, [url, reconnectInterval, maxReconnectAttempts, reconnectCount, onMessage, onOpen, onClose, onError]);

    const disconnect = useCallback(() => {
        shouldReconnectRef.current = false;
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
    }, []);

    const sendMessage = useCallback((data) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            const message = typeof data === 'string' ? data : JSON.stringify(data);
            wsRef.current.send(message);
            return true;
        } else {
            console.warn('[WebSocket] Cannot send message, not connected');
            return false;
        }
    }, []);

    useEffect(() => {
        if (autoConnect && url) {
            shouldReconnectRef.current = true;
            connect();
        }

        return () => {
            disconnect();
        };
    }, [url, autoConnect]); // connect and disconnect are stable due to useCallback

    return {
        isConnected,
        lastMessage,
        sendMessage,
        connect,
        disconnect,
        reconnectCount
    };
};

export default useWebSocket;
