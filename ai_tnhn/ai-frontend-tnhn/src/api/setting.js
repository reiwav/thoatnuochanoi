import axiosClient from './axiosClient';

const settingApi = {
    getFloodLevels: () => {
        return axiosClient.get('/admin/settings/flood-levels');
    },
    updateFloodLevels: (levels) => {
        return axiosClient.put('/admin/settings/flood-levels', levels);
    }
};

export default settingApi;
