import api from './axiosInstance';

export const getLecturerDashboard = () => api.get('/lecturer/dashboard');
export const getStudentDashboard  = () => api.get('/student/dashboard');

export const getStudentSubmissionsList = (params) => api.get('/student/submissions', { params });
export const getStudentAssessmentResults = (assessmentId) => api.get(`/student/assessments/${assessmentId}/results`);

export const getCourseStudentSubmissions = (courseId, studentId) => 
  api.get(`/lecturer/courses/${courseId}/students/${studentId}/submissions`);

export const getAssessmentStudentSubmissions = (assessmentId, studentId) => 
  api.get(`/lecturer/assessments/${assessmentId}/students/${studentId}/submissions`);
