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
    createProgress: (data) => {
        if (data instanceof FormData) {
            return axiosClient.post('/admin/emergency-constructions/progress', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        }
        return axiosClient.post('/admin/emergency-constructions/progress', data);
    },
    updateProgress: (id, data) => {
        if (data instanceof FormData) {
            return axiosClient.put(`/admin/emergency-constructions/progress/${id}`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        }
        return axiosClient.put(`/admin/emergency-constructions/progress/${id}`, data);
    },
    getProgressById: (id) => {
        return axiosClient.get(`/admin/emergency-constructions/progress/` + id);
    },
    getProgressHistory: (id) => {
        return axiosClient.get(`/admin/emergency-constructions/${id}/progress`);
    }
};

export default emergencyConstructionApi;
