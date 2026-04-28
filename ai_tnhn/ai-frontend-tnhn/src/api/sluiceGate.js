import axiosClient from './axiosClient';

const sluiceGateApi = {
    list: (params) => axiosClient.get('/admin/stations/sluice-gate', { params }),
    get: (id) => axiosClient.get(`/admin/stations/sluice-gate/${id}`),
    create: (data) => axiosClient.post('/admin/stations/sluice-gate', data),
    update: (id, data) => axiosClient.put(`/admin/stations/sluice-gate/${id}`, data),
    delete: (id) => axiosClient.delete(`/admin/stations/sluice-gate/${id}`),
    report: (id, data) => axiosClient.post(`/admin/stations/sluice-gate/${id}/report`, data),
    getHistory: (id, params) => axiosClient.get(`/admin/stations/sluice-gate/${id}/history`, { params }),
};

export default sluiceGateApi;
