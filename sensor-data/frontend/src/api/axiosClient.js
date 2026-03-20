import axios from 'axios';

const axiosClient = axios.create({
  baseURL: (import.meta.env?.VITE_APP_API_URL || 'http://localhost:8080') + '/api',
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sensor_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (!(config.data instanceof FormData) && !config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

export default axiosClient;
