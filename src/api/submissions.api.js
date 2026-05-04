import api from './axiosInstance';

export const createSubmission = (data)   => api.post('/submissions', data);
export const getSubmission    = (id)     => api.get(`/submissions/${id}`);
export const getSubmissions   = (params) => api.get('/submissions', { params });
