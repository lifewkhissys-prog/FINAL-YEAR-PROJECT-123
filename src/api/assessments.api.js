import api from './axiosInstance';

export const createAssessment  = (data)     => api.post('/assessments', data);
export const getAssessment     = (id)        => api.get(`/assessments/${id}`);
export const updateAssessment  = (id, data)  => api.put(`/assessments/${id}`, data);
export const getGradebook      = (id)        => api.get(`/assessments/${id}/gradebook`);
export const getActiveAssessments = ()       => api.get('/assessments/active');
