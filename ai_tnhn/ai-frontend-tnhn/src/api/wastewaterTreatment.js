import axiosClient from './axiosClient';

const wastewaterTreatmentApi = {
    // Basic Station CRUD
    list: (params) => axiosClient.get('/admin/stations/wastewater', { params }),
    get: (id) => axiosClient.get(`/admin/stations/wastewater/${id}`),
    create: (data) => axiosClient.post('/admin/stations/wastewater', data),
    update: (id, data) => axiosClient.put(`/admin/stations/wastewater/${id}`, data),
    delete: (id) => axiosClient.delete(`/admin/stations/wastewater/${id}`),

    // Operational reporting
    report: (id, data) => axiosClient.post(`/admin/stations/wastewater/${id}/report`, data),

    // History
    getHistory: (id, params) => axiosClient.get(`/admin/stations/wastewater/${id}/history`, { params }),
};

export default wastewaterTreatmentApi;
