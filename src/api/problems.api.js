import api from './axiosInstance';

export const getProblems    = (params)    => api.get('/problems', { params });
export const getProblem     = (id)        => api.get(`/problems/${id}`);
export const createProblem  = (data)      => api.post('/problems', data);
export const updateProblem  = (id, data)  => api.put(`/problems/${id}`, data);
export const deleteProblem  = (id)        => api.delete(`/problems/${id}`);
export const addTestCase    = (id, data)  => api.post(`/problems/${id}/test-cases`, data);
export const updateTestCase = (id, data)  => api.put(`/test-cases/${id}`, data);
export const deleteTestCase = (id)        => api.delete(`/test-cases/${id}`);
