import axios from 'axios';

const baseURL = (import.meta.env.VITE_APP_API_URL !== undefined ? import.meta.env.VITE_APP_API_URL : 'http://localhost:8099') + '/api';

const axiosClient = axios.create({
  baseURL,
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
