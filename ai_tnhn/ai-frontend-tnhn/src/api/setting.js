import axiosClient from './axiosClient';

const settingApi = {
    getFloodLevels: () => {
        return axiosClient.get('/admin/settings/flood-levels');
    },
    updateFloodLevels: (levels) => {
        return axiosClient.put('/admin/settings/flood-levels', levels);
    },
    getRainSetting: () => {
        return axiosClient.get('/admin/settings/rain');
    },
    updateRainSetting: (data) => {
        return axiosClient.put('/admin/settings/rain', data);
    },
    autoGetRainSession: () => {
        return axiosClient.post('/admin/settings/rain/auto-session');
    },
    getWaterSourceSetting: () => {
        return axiosClient.get('/admin/settings/water-source');
    },
    updateWaterSourceSetting: (data) => {
        return axiosClient.put('/admin/settings/water-source', data);
    },
    getActiveWaterThreshold: (year) => {
        return axiosClient.get('/admin/settings/water-thresholds/active', { params: { year } });
    },
    listWaterThresholds: (params) => {
        return axiosClient.get('/admin/settings/water-thresholds', { params });
    },
    createWaterThreshold: (data) => {
        return axiosClient.post('/admin/settings/water-thresholds', data);
    },
    activateWaterThreshold: (id) => {
        return axiosClient.put(`/admin/settings/water-thresholds/${id}/activate`);
    }
};

export default settingApi;
