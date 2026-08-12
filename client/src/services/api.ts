import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://elite-attendance-api.onrender.com/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('elite_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      if (error.response.data?.message?.includes('token') || error.response.data?.message?.includes('Authorization')) {
        localStorage.removeItem('elite_token');
        localStorage.removeItem('elite_user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);


export default api;
