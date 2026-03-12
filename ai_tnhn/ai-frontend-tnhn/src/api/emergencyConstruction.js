import axiosClient from './axiosClient';

const emergencyConstructionApi = {
    getAll: (params) => {
        return axiosClient.get('/admin/emergency-constructions', { params });
    },
    getById: (id) => {
        return axiosClient.get(`/admin/emergency-constructions/${id}`);
    },
    create: (data) => {
        return axiosClient.post('/admin/emergency-constructions', data);
    },
    update: (id, data) => {
        return axiosClient.put(`/admin/emergency-constructions/${id}`, data);
    },
    delete: (id) => {
        return axiosClient.delete(`/admin/emergency-constructions/${id}`);
    },
    getHistory: (id) => {
        return axiosClient.get(`/admin/emergency-constructions/${id}/history`);
    },
    getGlobalHistory: (params) => {
        return axiosClient.get('/admin/emergency-constructions/history', { params });
    },
    createSituation: (data) => {
        return axiosClient.post('/admin/emergency-constructions/situation', data);
    },
    getSituationHistory: (id) => {
        return axiosClient.get(`/admin/emergency-constructions/${id}/situation`);
    }
};

export default emergencyConstructionApi;
