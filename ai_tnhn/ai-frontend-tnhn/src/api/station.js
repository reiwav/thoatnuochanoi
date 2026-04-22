import axiosClient from './axiosClient';

const stationApi = {
    // Rain Stations
    rain: {
        getAll: (params) => axiosClient.get('/admin/stations/rain', { params }),
        getById: (id) => axiosClient.get(`/admin/stations/rain/${id}`),
        create: (data) => axiosClient.post('/admin/stations/rain', data),
        update: (id, data) => axiosClient.put(`/admin/stations/rain/${id}`, data),
        delete: (id) => axiosClient.delete(`/admin/stations/rain/${id}`),
        getHistory: (id, params) => axiosClient.get(`/admin/water/rain/${id}/history`, { params })
    },
    // Lake Stations
    lake: {
        getAll: (params) => axiosClient.get('/admin/stations/lake', { params }),
        getById: (id) => axiosClient.get(`/admin/stations/lake/${id}`),
        create: (data) => axiosClient.post('/admin/stations/lake', data),
        update: (id, data) => axiosClient.put(`/admin/stations/lake/${id}`, data),
        delete: (id) => axiosClient.delete(`/admin/stations/lake/${id}`),
        getHistory: (id, params) => axiosClient.get(`/admin/water/lake/${id}/history`, { params })
    },
    // River Stations
    river: {
        getAll: (params) => axiosClient.get('/admin/stations/river', { params }),
        getById: (id) => axiosClient.get(`/admin/stations/river/${id}`),
        create: (data) => axiosClient.post('/admin/stations/river', data),
        update: (id, data) => axiosClient.put(`/admin/stations/river/${id}`, data),
        delete: (id) => axiosClient.delete(`/admin/stations/river/${id}`),
        getHistory: (id, params) => axiosClient.get(`/admin/water/river/${id}/history`, { params })
    },
    // Inundation Points
    inundation: {
        getAll: (params) => axiosClient.get('/inundation/points-list', { params }),
        create: (data) => axiosClient.post('/inundation/points', data),
        update: (id, data) => axiosClient.put(`/inundation/points/${id}`, data),
        delete: (id) => axiosClient.delete(`/inundation/points/${id}`)
    }
};

export default stationApi;
