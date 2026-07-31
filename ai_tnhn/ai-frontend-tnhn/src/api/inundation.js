import axiosClient from './axiosClient';

const inundationApi = {
    reportEnterprise: (pointId, formData) => {
        return axiosClient.put(`/inundation/point/${pointId}/enterprise`, formData, {
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
    getPointHistory: (pointId, lastReportId = '', limit = 5) => {
        let url = `/inundation/history?point_id=${pointId}&size=${limit}`;
        if (lastReportId) url += `&last_report_id=${lastReportId}`;
        return axiosClient.get(url);
    },
    getReportHistory: (reportId) => {
        return axiosClient.get(`/inundation/report-history?report_id=${reportId}`);
    },
    correctEnterpriseReport: (pointId, formData) => {
        return axiosClient.put(`/inundation/point/${pointId}/correct`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    reportEnterpriseSituation: (pointId, formData) => {
        return axiosClient.post(`/inundation/point/${pointId}/update`, formData, {
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
    correctEnterpriseSituation: (pointId, formData) => {
        return axiosClient.put(`/inundation/point/${pointId}/correct-update`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    reportSurvey: (pointId, formData) => {
        return axiosClient.put(`/inundation/point/${pointId}/survey`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    reportMech: (pointId, formData) => {
        return axiosClient.put(`/inundation/point/${pointId}/mech`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    reportKTCL: (pointId, formData) => {
        return axiosClient.put(`/inundation/point/${pointId}/ktcl`, formData, {
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
    },
    getHistoryByDateRange: (startDate, endDate, pointId) => {
        let url = `/inundation/by-date?start_date=${startDate}&end_date=${endDate}`;
        if (pointId) url += `&point_id=${pointId}`;
        return axiosClient.get(url);
    }
};

export default inundationApi;
