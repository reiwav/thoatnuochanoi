import axiosClient from './axiosClient';

const inundationApi = {
    createReport: (formData) => {
        return axiosClient.post('/inundation/report', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },
    listReports: (page = 0, size = 10, filters = {}) => {
        let url = `/inundation/reports?page=${page}&size=${size}`;
        if (filters.status) url += `&status=${filters.status}`;
        if (filters.traffic_status) url += `&traffic_status=${encodeURIComponent(filters.traffic_status)}`;
        if (filters.query) url += `&query=${encodeURIComponent(filters.query)}`;
        return axiosClient.get(url);
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
