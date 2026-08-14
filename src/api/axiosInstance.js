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
  const baseURL = import.meta.env.VITE_API_BASE_URL || '';
  const fullUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `${baseURL}${url}`;
  return await fetch(fullUrl, { ...options, headers });
}

export async function safeJson(res) {
  if (!res) return null;
  try {
    const text = await res.text();
    if (!text || !text.trim()) return null;
    return JSON.parse(text);
  } catch (e) {
    console.warn("safeJson: Failed to parse response as JSON:", e);
    return null;
  }
}

export default api;

