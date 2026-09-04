import axios from 'axios';
import useAuthStore from '../store/authStore';

let isRedirecting = false;

export function handleUnauthorized(reason = 'expired') {
  // Clear auth store and cached tokens
  useAuthStore.getState().logout();

  const pathname = window.location.pathname;
  if (pathname === '/login' || pathname === '/register') {
    return;
  }

  if (!isRedirecting) {
    isRedirecting = true;
    const search = reason === 'expired' ? '?expired=true' : '';
    window.location.href = `/login${search}`;
  }
}

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
  (err) => {
    if (err.response?.status === 401) {
      const url = err.config?.url || '';
      // Don't auto-logout if the 401 is from bad credentials on the login endpoint itself
      if (!url.includes('/api/auth/login')) {
        handleUnauthorized('expired');
      }
    }
    return Promise.reject(err);
  }
);

export async function authFetch(url, options = {}) {
  const token = localStorage.getItem('devlab_token');
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  let baseURL = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (baseURL.endsWith('/')) {
    baseURL = baseURL.slice(0, -1);
  }
  const fullUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `${baseURL}${url}`;
  try {
    const res = await fetch(fullUrl, { ...options, headers });
    if (res.status === 401 && !url.includes('/api/auth/login')) {
      handleUnauthorized('expired');
    }
    return res;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.toLowerCase().includes('fetch')) {
      throw new Error(`Network error connecting to backend API (${fullUrl}). Please verify backend is running and CORS/VITE_API_BASE_URL are correctly set.`);
    }
    throw err;
  }
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

