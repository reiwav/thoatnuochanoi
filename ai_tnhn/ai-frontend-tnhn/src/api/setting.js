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
    }
};

export default settingApi;
