import axiosClient from './axiosClient';

const contractCategoryApi = {
    getAll: (params) => {
        return axiosClient.get('/admin/contract-category', { params });
    },
    getTree: () => {
        return axiosClient.get('/admin/contract-category/tree');
    },
    getById: (id) => {
        return axiosClient.get(`/admin/contract-category/${id}`);
    },
    create: (data) => {
        return axiosClient.post('/admin/contract-category', data);
    },
    update: (id, data) => {
        return axiosClient.put(`/admin/contract-category/${id}`, data);
    },
    delete: (id) => {
        return axiosClient.delete(`/admin/contract-category/${id}`);
    }
};

export default contractCategoryApi;
