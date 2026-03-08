import axiosClient from './axiosClient';

const inundationApi = {
    createReport: (formData) => {
        return axiosClient.post('/inundation/report', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },
    listReports: () => {
        return axiosClient.get('/inundation/reports');
    },
    getReport: (id) => {
        return axiosClient.get(`/inundation/report/${id}`);
    },
    updateSituation: (id, formData) => {
        return axiosClient.post(`/inundation/${id}/update`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },
    resolveReport: (id, data) => {
        return axiosClient.post(`/inundation/${id}/resolve`, data);
    },
    getPointsStatus: () => {
        return axiosClient.get('/inundation/points-status');
    },
    createPoint: (data) => {
        return axiosClient.post('/inundation/points', data);
    }
};

export default inundationApi;
