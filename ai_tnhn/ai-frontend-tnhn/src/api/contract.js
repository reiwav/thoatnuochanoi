import axiosClient from './axiosClient';

const contractApi = {
    getAll: (params) => axiosClient.get('/admin/contracts', { params }),
    getById: (id) => axiosClient.get(`/admin/contracts/${id}`),
    create: (data) => axiosClient.post('/admin/contracts', data),
    update: (id, data) => axiosClient.put(`/admin/contracts/${id}`, data),
    delete: (id) => axiosClient.delete(`/admin/contracts/${id}`),
    upload: (id, formData) => axiosClient.post(`/admin/contracts/${id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    prepareFolder: (data) => axiosClient.post('/admin/contracts/prepare-folder', data),
    uploadToFolder: (folderId, formData) => axiosClient.post(`/admin/contracts/upload-to-folder?folder_id=${folderId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    chatContract: (data) => axiosClient.post('/admin/google/contract-chat', data)
};

export default contractApi;
