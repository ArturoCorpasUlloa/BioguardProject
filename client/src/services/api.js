const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('bioguard_token');
}

export async function api(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
  };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error de red' }));
    const detail = Array.isArray(error.details)
      ? error.details.map((item) => `${item.path?.join('.') || 'registro'}: ${item.message}`).join('; ')
      : '';
    const exception = new Error([error.error || 'Solicitud fallida', detail].filter(Boolean).join(' · '));
    exception.details = error.details;
    throw exception;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function downloadSqlExport() {
  const token = getToken();
  const response = await fetch(`${API_BASE}/export/sql`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'No se pudo exportar la base de datos' }));
    throw new Error(error.error || 'No se pudo exportar la base de datos');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bioguard-export-${new Date().toISOString().slice(0, 10)}.sql`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadEquipmentDocument(equipmentId, documentId, fileName) {
  const token = getToken();
  const response = await fetch(`/api/equipment/${equipmentId}/documents/${documentId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error('No se pudo descargar el documento');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = fileName; link.click();
  URL.revokeObjectURL(url);
}

export const authApi = {
  login: (data) => api('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data) => api('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => api('/auth/me'),
  changePassword: (data) => api('/auth/password', { method: 'PATCH', body: JSON.stringify(data) }),
};

export const accessApi = {
  users: {
    list: () => api('/admin/users'),
    create: (data) => api('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => api(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    changePassword: (id, password) => api(`/admin/users/${id}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ password }),
    }),
    remove: (id) => api(`/admin/users/${id}`, { method: 'DELETE' }),
  },
  roles: {
    list: () => api('/admin/roles'),
    create: (data) => api('/admin/roles', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => api(`/admin/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => api(`/admin/roles/${id}`, { method: 'DELETE' }),
  },
  permissions: () => api('/admin/permissions'),
};

export const dashboardApi = {
  get: () => api('/dashboard'),
};

export const areasApi = {
  list: () => api('/areas'),
  create: (data) => api('/areas', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => api(`/areas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => api(`/areas/${id}`, { method: 'DELETE' }),
};

export const equipmentApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
    ).toString();
    return api(`/equipment${query ? `?${query}` : ''}`);
  },
  get: (id) => api(`/equipment/${id}`),
  create: (data) => api('/equipment', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => api(`/equipment/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  uploadDocument: (id, file, metadata = {}) => {
    const body = file instanceof FormData ? file : new FormData();
    if (!(file instanceof FormData)) body.append('file', file);
    Object.entries(metadata).forEach(([key, value]) => body.append(key, value || ''));
    return api(`/equipment/${id}/files`, { method: 'POST', body });
  },
  listDocuments: (id) => api(`/equipment/${id}/documents`),
  deleteDocument: (id, documentId) => api(`/equipment/${id}/documents/${documentId}`, { method: 'DELETE' }),
  documentDownloadUrl: (id, documentId) => `/api/equipment/${id}/documents/${documentId}/download`,
  remove: (id) => api(`/equipment/${id}`, { method: 'DELETE' }),
};

export const operationsApi = {
  maintenance: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return api(`/maintenance${query ? `?${query}` : ''}`);
    },
    create: (data) => api('/maintenance', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => api(`/maintenance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => api(`/maintenance/${id}`, { method: 'DELETE' }),
    bulkCreate: (records) => api('/maintenance/bulk', { method: 'POST', body: JSON.stringify({ records }) }),
  },
  incidents: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return api(`/incidents${query ? `?${query}` : ''}`);
    },
    create: (data) => api('/incidents', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => api(`/incidents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => api(`/incidents/${id}`, { method: 'DELETE' }),
    bulkCreate: (records) => api('/incidents/bulk', { method: 'POST', body: JSON.stringify({ records }) }),
  },
  licenses: {
    list: () => api('/licenses'),
    create: (data) => api('/licenses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => api(`/licenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => api(`/licenses/${id}`, { method: 'DELETE' }),
  },
  contracts: {
    list: () => api('/contracts'),
    create: (data) => api('/contracts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => api(`/contracts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => api(`/contracts/${id}`, { method: 'DELETE' }),
  },
  qualityControls: {
    list: () => api('/quality-controls'),
    create: (data) => api('/quality-controls', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => api(`/quality-controls/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => api(`/quality-controls/${id}`, { method: 'DELETE' }),
  },
  dicom: {
    list: () => api('/dicom'),
    save: (data) => api('/dicom', { method: 'POST', body: JSON.stringify(data) }),
    remove: (equipmentId) => api(`/dicom/${equipmentId}`, { method: 'DELETE' }),
  },
  schedule: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return api(`/schedule${query ? `?${query}` : ''}`);
    },
    create: (data) => api('/schedule', { method: 'POST', body: JSON.stringify(data) }),
    remove: (id) => api(`/schedule/${id}`, { method: 'DELETE' }),
    update: (id, data) => api(`/schedule/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },
};
