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
        if (filters.point_id) url += `&point_id=${filters.point_id}`;
        if (filters.traffic_status) url += `&traffic_status=${encodeURIComponent(filters.traffic_status)}`;
        if (filters.query) url += `&query=${encodeURIComponent(filters.query)}`;
        if (filters.org_id) url += `&org_id=${filters.org_id}`;
        if (filters.is_flooding !== undefined && filters.is_flooding !== '') url += `&is_flooding=${filters.is_flooding}`;
        if (filters.from_time) url += `&from_time=${filters.from_time}`;
        if (filters.to_time) url += `&to_time=${filters.to_time}`;
        return axiosClient.get(url);
    },
    getReport: (id) => {
        return axiosClient.get(`/inundation/report/${id}`);
    },
    getPointHistory: (pointId, fromTime, toTime) => {
        let url = `/inundation/reports?point_id=${pointId}&size=100`;
        if (fromTime) url += `&from_time=${fromTime}`;
        if (toTime) url += `&to_time=${toTime}`;
        return axiosClient.get(url);
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
    getPointsList: (params) => {
        return axiosClient.get('/inundation/points-list', { params });
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
    },
    quickFinish: (pointId) => {
        return axiosClient.post('/inundation/quick-finish', { point_id: pointId });
    }
};

export default inundationApi;
