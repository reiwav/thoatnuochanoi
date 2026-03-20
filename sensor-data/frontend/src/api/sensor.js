import axiosClient from './axiosClient';

const sensorApi = {
  getMonitor: (params) => axiosClient.get('/data/monitor', { params }),
  getHistoryTrend: (link, channel, startDate, endDate) => axiosClient.get('/data/history-trend', { params: { link, channel, start_date: startDate, end_date: endDate } }),
  getAlarms: (params) => axiosClient.get('/data/alarms', { params }),
  getOutputs: (params) => axiosClient.get('/data/outputs', { params }),
  toggleOutput: (id, control, link) => axiosClient.patch(`/data/outputs/${id}`, { control, link }),
};

export default sensorApi;
