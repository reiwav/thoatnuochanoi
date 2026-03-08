import axiosClient from './axiosClient';

const authEmployeeApi = {
    login: (data) => {
        return axiosClient.post('/auth/employee-login', data);
    }
};

export default authEmployeeApi;
