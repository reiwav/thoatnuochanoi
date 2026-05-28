import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import settingApi from 'api/setting';

const useRainSetting = () => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [sessionID, setSessionID] = useState('');

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

    return {
        loading,
        saving,
        sessionID,
        setSessionID,
        handleSave
    };
};

export default useRainSetting;
