import axiosClient from './axiosClient';

const organizationApi = {
    getAll: (params) => {
        return axiosClient.get('/admin/organizations', { params });
    },
    getSelectionList: () => {
        return axiosClient.get('/admin/organizations/selection');
    },
    getById: (id) => {
        return axiosClient.get(`/admin/organizations/${id}`);
    },
    create: (data) => {
        return axiosClient.post('/admin/organizations', data);
    },
    update: (id, data) => {
        return axiosClient.put(`/admin/organizations/${id}`, data);
    },
    delete: (id) => {
        return axiosClient.delete(`/admin/organizations/${id}`);
    }
};

export default organizationApi;
