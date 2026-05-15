import axios from 'axios';

// Point axios at the Render API (used by any direct axios calls)
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL ?? window.location.origin;

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('dcl_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('dcl_token');
      localStorage.removeItem('dcl_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default axios;
