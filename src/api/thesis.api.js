import api from './axiosInstance';

export const uploadThesis = async (formData) => {
  const response = await api.post('/thesis-critique', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const listTheses = async () => {
  const response = await api.get('/thesis-critique');
  return response.data;
};

export const getThesisDetail = async (id) => {
  const response = await api.get(`/thesis-critique/${id}`);
  return response.data;
};

export const deleteThesis = async (id) => {
  const response = await api.delete(`/thesis-critique/${id}`);
  return response.data;
};

export const exportThesisDocx = async (id, title) => {
  const response = await api.get(`/thesis-critique/${id}/export`, {
    responseType: 'blob',
  });
  
  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  const cleanTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  link.setAttribute('download', `${cleanTitle}_critique.docx`);
  
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
};

