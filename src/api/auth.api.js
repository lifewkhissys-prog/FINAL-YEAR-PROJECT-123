import api from './axiosInstance';

export const login    = (data) => api.post('/api/auth/login', data);
export const register = (data) => api.post('/api/auth/register', data);
export const logout   = ()     => api.post('/api/auth/logout');
export const getMe    = ()     => api.get('/api/auth/me');
