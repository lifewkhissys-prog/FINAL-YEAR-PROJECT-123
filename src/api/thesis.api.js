import api from './axiosInstance';

// ── Rubric Criteria ─────────────────────────────────────────────────────────

export const createCriterion = async (data) => {
  const res = await api.post('/rubric/criteria', data);
  return res.data;
};

export const listCriteria = async () => {
  const res = await api.get('/rubric/criteria');
  return res.data;
};

export const updateCriterion = async (id, data) => {
  const res = await api.patch(`/rubric/criteria/${id}`, data);
  return res.data;
};

// ── Thesis Submissions ──────────────────────────────────────────────────────

export const uploadThesis = async (formData) => {
  const res = await api.post('/thesis-submissions', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const listSubmissions = async () => {
  const res = await api.get('/thesis-submissions');
  return res.data;
};

export const getSubmission = async (id) => {
  const res = await api.get(`/thesis-submissions/${id}`);
  return res.data;
};

export const deleteSubmission = async (id) => {
  await api.delete(`/thesis-submissions/${id}`);
};

export const triggerAssessment = async (id) => {
  const res = await api.post(`/thesis-submissions/${id}/assess`);
  return res.data;
};

export const getResults = async (id) => {
  const res = await api.get(`/thesis-submissions/${id}/results`);
  return res.data;
};

export const overrideResult = async (submissionId, criterionId, data) => {
  const res = await api.patch(
    `/thesis-submissions/${submissionId}/results/${criterionId}`,
    data
  );
  return res.data;
};

export const getReport = async (id) => {
  const res = await api.get(`/thesis-submissions/${id}/report`);
  return res.data;
};

export const updateReport = async (id, data) => {
  const res = await api.patch(`/thesis-submissions/${id}/report`, data);
  return res.data;
};

export const exportSubmissionDocx = async (id, title) => {
  const res = await api.get(`/thesis-submissions/${id}/export`, {
    responseType: 'blob',
  });
  const blob = new Blob([res.data], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const clean = (title || 'report').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  link.setAttribute('download', `${clean}_assessment.docx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ── Graded Examples ─────────────────────────────────────────────────────────

export const createExample = async (data) => {
  const res = await api.post('/graded-examples', data);
  return res.data;
};

export const listExamples = async (criterionId) => {
  const params = criterionId ? { criterionId } : {};
  const res = await api.get('/graded-examples', { params });
  return res.data;
};
