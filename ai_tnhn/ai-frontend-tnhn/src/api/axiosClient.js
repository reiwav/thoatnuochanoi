import axios from 'axios';

const axiosClient = axios.create({
  baseURL: (import.meta.env?.VITE_APP_API_URL || '') + '/api',
});

// Gắn token vào header trước mỗi request
axiosClient.interceptors.request.use((config) => {
  let token = null;
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const state = JSON.parse(authStorage);
      token = state?.state?.token;
    }
    if (!token) {
      token = localStorage.getItem('admin_token');
    }
  } catch (error) {
    console.error('Error fetching token from storage', error);
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  } else if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }

  return config;
});

// Response interceptor: Tự động bóc tách dữ liệu và xử lý lỗi tập trung
axiosClient.interceptors.response.use(
  (response) => {
    // Axios luôn bọc body trong response.data
    const data = response.data;

    // Kiểm tra cấu trúc chuẩn của backend { status: 'success', data: ... }
    if (data && data.status === 'success') {
      return data.data; // Trả về thẳng phần payload (là mảng hoặc object hoặc {data: [], total: 0})
    }

    // Nếu API trả về lỗi nghiệp vụ { status: 'error', error: '...' }
    if (data && data.status === 'error') {
      return Promise.reject(new Error(data.error || 'Đã có lỗi xảy ra từ máy chủ'));
    }

    // Trường hợp khác (ví dụ phản hồi blob hoặc không đúng format chuẩn)
    return response;
  },
  (error) => {
    // Xử lý các lỗi HTTP (401, 403, 500, ...)
    const ADMIN_TOKEN_KEY = 'admin_token';
    if (error.response?.status === 401) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      window.location.href = '/pages/login';
    }
    const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message;
    return Promise.reject(new Error(errorMessage));
  }
);

export default axiosClient;