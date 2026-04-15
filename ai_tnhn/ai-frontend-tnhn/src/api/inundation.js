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
        if (filters.org_id) url += `&org_id=${filters.org_id}`;
        return axiosClient.get(url);
    },
    getReport: (id) => {
        return axiosClient.get(`/inundation/report/${id}`);
    },
    updateReport: (id, formData) => {
        return axiosClient.put(`/inundation/report/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
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
    getPointsStatus: (params) => {
        return axiosClient.get('/inundation/points-status', { params });
    },
    createPoint: (data) => {
        return axiosClient.post('/inundation/points', data);
    },
    updatePoint: (id, data) => {
        return axiosClient.put(`/inundation/points/${id}`, data);
    },
    deletePoint: (id) => {
        return axiosClient.delete(`/inundation/points/${id}`);
    },
    reviewReport: (id, comment) => {
        return axiosClient.post(`/inundation/report/${id}/review`, { comment });
    },
    reviewUpdate: (id, comment) => {
        return axiosClient.post(`/inundation/update/${id}/review`, { comment });
    },
    updateUpdateContent: (id, formData) => {
        return axiosClient.put(`/inundation/update/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    updateSurvey: (id, formData) => {
        return axiosClient.put(`/inundation/report/${id}/survey`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    updateMech: (id, formData) => {
        return axiosClient.put(`/inundation/report/${id}/mech`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    getYearlyHistory: (year, org_id) => {
        let url = `/inundation/yearly-history?year=${year}`;
        if (org_id) url += `&org_id=${org_id}`;
        return axiosClient.get(url);
    },
    exportYearlyHistory: (year, org_id) => {
        let url = `/inundation/yearly-history/export?year=${year}`;
        if (org_id) url += `&org_id=${org_id}`;
        return axiosClient.get(url, { responseType: 'blob' });
    }
};

export default inundationApi;
