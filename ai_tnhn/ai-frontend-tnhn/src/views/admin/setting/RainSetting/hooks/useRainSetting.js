import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import settingApi from 'api/setting';

const useRainSetting = () => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [sessionID, setSessionID] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [logs, setLogs] = useState([]);

    const fetchRainSetting = async () => {
        setLoading(true);
        try {
            const response = await settingApi.getRainSetting();
            if (response && response.session_id) {
                setSessionID(response.session_id);
            }
        } catch (err) {
            toast.error('Lỗi lấy dữ liệu cấu hình lượng mưa');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRainSetting();
    }, []);

    const handleSave = async () => {
        if (!sessionID) {
            toast.error('Vui lòng nhập Session ID');
            return;
        }
        setSaving(true);
        try {
            await settingApi.updateRainSetting({ session_id: sessionID });
            toast.success('Lưu cấu hình thành công');
        } catch (err) {
            toast.error(err.response?.data?.error || err.message || 'Lỗi lưu cấu hình');
        } finally {
            setSaving(false);
        }
    };

    const handleSync = () => {
        if (isSyncing) return;

        setIsSyncing(true);
        setLogs([{ text: 'Bắt đầu kết nối để đồng bộ dữ liệu...', type: 'info', time: new Date().toLocaleTimeString() }]);

        let token = null;
        try {
            const authStorage = localStorage.getItem('auth-storage');
            if (authStorage) {
                const state = JSON.parse(authStorage);
                token = state?.state?.token;
            }
            if (!token) {
                token = localStorage.getItem('admin_token');
            }
        } catch (error) {
            console.error('Error fetching token from storage', error);
        }

        const baseUrl = import.meta.env?.VITE_APP_API_URL || '';
        const url = `${baseUrl}/api/admin/settings/rain/sync?access_token=${token || ''}`;

        const eventSource = new EventSource(url);

        eventSource.onmessage = (event) => {
            const msg = event.data;
            let type = 'info';
            if (msg.includes('Thành công')) {
                type = 'success';
            } else if (msg.includes('Lỗi')) {
                type = 'error';
            } else if (msg.includes('Hoàn thành')) {
                type = 'done';
                eventSource.close();
                setIsSyncing(false);
                toast.success('Đồng bộ dữ liệu lượng mưa hoàn tất!');
            }

            setLogs((prev) => [...prev, { text: msg, type, time: new Date().toLocaleTimeString() }]);
        };

        eventSource.onerror = (error) => {
            console.error('SSE Error:', error);
            setLogs((prev) => [...prev, { text: 'Kết nối bị ngắt hoặc xảy ra lỗi đồng bộ.', type: 'error', time: new Date().toLocaleTimeString() }]);
            eventSource.close();
            setIsSyncing(false);
            toast.error('Đồng bộ thất bại hoặc kết nối bị ngắt!');
        };
    };

    const clearLogs = () => {
        setLogs([]);
    };

    return {
        loading,
        saving,
        sessionID,
        setSessionID,
        handleSave,
        isSyncing,
        logs,
        handleSync,
        clearLogs
    };
};

export default useRainSetting;
