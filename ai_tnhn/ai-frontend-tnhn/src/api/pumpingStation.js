import axiosClient from './axiosClient';

const pumpingStationApi = {
    // Basic Station CRUD
    list: (params) => axiosClient.get('/admin/stations/pumping', { params }),
    get: (id) => axiosClient.get(`/admin/stations/pumping/${id}`),
    create: (data) => axiosClient.post('/admin/stations/pumping', data),
    update: (id, data) => axiosClient.put(`/admin/stations/pumping/${id}`, data),
    delete: (id) => axiosClient.delete(`/admin/stations/pumping/${id}`),

    // Operational reporting (for employees)
    report: (data) => axiosClient.post('/admin/stations/pumping/report', data),

    // History (for admins)
    getHistory: (id, params) => axiosClient.get(`/admin/stations/pumping/${id}/history`, { params }),
};

export default pumpingStationApi;
