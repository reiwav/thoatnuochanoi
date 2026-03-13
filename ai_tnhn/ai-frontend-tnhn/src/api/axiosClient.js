import axios from 'axios';
import { ADMIN_TOKEN } from 'constants/auth';

const axiosClient = axios.create({
  baseURL: (import.meta.env?.VITE_APP_API_URL || '') + '/api',
});

// Gắn token vào header trước mỗi request
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(ADMIN_TOKEN);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Nếu dữ liệu là FormData, hãy để trình duyệt tự quyết định Content-Type
  // Không nên ép cứng application/json cho tất cả request
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  } else if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }

  return config;
});
export default axiosClient;