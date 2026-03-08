import axiosClient from './axiosClient';

const employeeApi = {
    getAll: (params) => {
        return axiosClient.get('/admin/employees', { params });
    },
    getById: (id) => {
        return axiosClient.get(`/admin/employees/${id}`);
    },
    create: (data) => {
        return axiosClient.post('/admin/employees', data);
    },
    update: (id, data) => {
        return axiosClient.put(`/admin/employees/${id}`, data);
    },
    delete: (id) => {
        return axiosClient.delete(`/admin/employees/${id}`);
    }
};

export default employeeApi;
