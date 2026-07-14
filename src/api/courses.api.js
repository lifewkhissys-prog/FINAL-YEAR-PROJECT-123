import api from './axiosInstance';

export const getCourses      = ()         => api.get('/courses');
export const getCourse       = (id)       => api.get(`/courses/${id}`);
export const createCourse    = (data)     => api.post('/courses', data);
export const updateCourse    = (id, data) => api.put(`/courses/${id}`, data);
export const deleteCourse    = (id)       => api.delete(`/courses/${id}`);
export const enrollInCourse  = (id)       => api.post(`/courses/${id}/enroll`);
export const getCourseStudents  = (id)    => api.get(`/courses/${id}/students`);
export const removeStudent   = (courseId, userId) => api.delete(`/courses/${courseId}/students/${userId}`);
export const enrollInCourseByCode = (joinCode) => api.post('/courses/enroll', { joinCode });
