import axiosClient from './axiosClient';

const authApi = {
    login: (credentials) => {
        return axiosClient.post('/auth/login', credentials);
    },

    // Lấy profile (không cần param vì token nằm trong header rồi)
    getProfile: () => {
        return axiosClient.get('/auth/profile');
    },

    logout: () => {
        return axiosClient.post('/auth/logout');
    },

    updateProfile: (data) => {
        return axiosClient.put('/auth/profile', data);
    },

    changePassword: (data) => {
        return axiosClient.put('/auth/change-password', data);
    }
};

export default authApi;