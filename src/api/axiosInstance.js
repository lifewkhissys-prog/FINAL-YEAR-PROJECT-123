import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('devlab_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

export async function authFetch(url, options = {}) {
  const token = localStorage.getItem('devlab_token');
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  return await fetch(url, { ...options, headers });
}

export default api;

