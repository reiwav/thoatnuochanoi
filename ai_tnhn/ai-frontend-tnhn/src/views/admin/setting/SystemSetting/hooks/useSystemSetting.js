import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import settingApi from 'api/setting';

const useSystemSetting = () => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [source, setSource] = useState('api'); // 'api' hoặc 'db'

    const fetchWaterSource = async () => {
        setLoading(true);
        try {
            const res = await settingApi.getWaterSourceSetting();
            if (res && res.source) {
                setSource(res.source);
            }
        } catch (err) {
            toast.error('Lỗi khi tải cấu hình nguồn dữ liệu');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (selectedSource) => {
        setSaving(true);
        try {
            await settingApi.updateWaterSourceSetting({ source: selectedSource });
            setSource(selectedSource);
            toast.success('Cập nhật cấu hình hệ thống thành công');
        } catch (err) {
            toast.error('Lỗi khi cập nhật cấu hình hệ thống');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        fetchWaterSource();
    }, []);

    return {
        loading,
        saving,
        source,
        setSource,
        handleSave
    };
};

export default useSystemSetting;
