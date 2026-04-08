import axios from 'axios';

const axiosClient = axios.create({
  baseURL: (import.meta.env?.VITE_APP_API_URL || '') + '/api',
});

// Gắn token vào header trước mỗi request
axiosClient.interceptors.request.use((config) => {
  let token = null;
  try {
    // Break circular dependency by using a dynamic check or localStorage
    // Since zustand-persist uses a specific key, we can use that or a cleaner way
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const state = JSON.parse(authStorage);
      token = state?.state?.token;
    }
    
    // Fallback if needed
    if (!token) {
      token = localStorage.getItem('admin_token');
    }
  } catch (error) {
    console.error('Error fetching token from storage', error);
  }

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