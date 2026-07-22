import { useState, useEffect } from 'react';
import settingApi from 'api/setting';

const useThresholdConfigsField = ({ formData, handleChange }) => {
    const [activeSetting, setActiveSetting] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchActiveSetting = async () => {
            setLoading(true);
            try {
                const res = await settingApi.getActiveWaterThreshold();
                const setting = res?.data || res;
                setActiveSetting(setting);

                // Auto-initialize threshold_configs from active setting if missing or empty
                if (setting && setting.thresholds && (!formData.threshold_configs || formData.threshold_configs.length === 0)) {
                    const initialConfigs = setting.thresholds.map(th => ({
                        threshold_type: th.type,
                        threshold_name: th.name,
                        min_level: 0,
                        max_level: 0
                    }));
                    handleChange('threshold_configs', initialConfigs);
                }
            } catch (err) {
                console.error('Failed to load active water threshold setting:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchActiveSetting();
    }, []);

    const handleThresholdChange = (seasonType, field, value) => {
        const numValue = parseFloat(value) || 0;
        const currentConfigs = formData.threshold_configs || [];
        const existingIndex = currentConfigs.findIndex(cfg => cfg.threshold_type === seasonType);

        let updatedConfigs = [...currentConfigs];
        if (existingIndex >= 0) {
            updatedConfigs[existingIndex] = {
                ...updatedConfigs[existingIndex],
                [field]: numValue
            };
        } else {
            const seasonName = seasonType === 'mua_kho' ? 'Mùa khô' : (seasonType === 'mua_mua' ? 'Mùa mưa' : seasonType);
            updatedConfigs.push({
                threshold_type: seasonType,
                threshold_name: seasonName,
                min_level: field === 'min_level' ? numValue : 0,
                max_level: field === 'max_level' ? numValue : 0
            });
        }

        handleChange('threshold_configs', updatedConfigs);
    };

    const getThresholdVal = (seasonType, field) => {
        const cfg = (formData.threshold_configs || []).find(c => c.threshold_type === seasonType);
        return cfg ? (cfg[field] !== undefined ? cfg[field] : '') : '';
    };

    return {
        activeSetting,
        loading,
        handleThresholdChange,
        getThresholdVal
    };
};

export default useThresholdConfigsField;
