import axiosClient from './axiosClient';

const reportApi = {
    getWaterReportDetails: () => axiosClient.get('/admin/google/water-report-details'),
    getRainSummary: () => axiosClient.get('/admin/google/rain-summary'),
    getWaterSummary: () => axiosClient.get('/admin/google/water-summary'),
    getInundationSummary: () => axiosClient.get('/admin/google/inundation-summary'),
    generateQuickReport: () => axiosClient.post('/admin/google/quick-report')
};

export default reportApi;
