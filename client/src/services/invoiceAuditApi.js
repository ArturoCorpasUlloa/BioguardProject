import { api } from './api';

export const invoiceAuditApi = {
  list: (period) => api(`/invoice-audits${period ? `?period=${encodeURIComponent(period)}` : ''}`),
  summary: (period) => api(`/invoice-audits/summary${period ? `?period=${encodeURIComponent(period)}` : ''}`),
  create: (data) => api('/invoice-audits', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => api(`/invoice-audits/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStatus: (id, status) => api(`/invoice-audits/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  remove: (id) => api(`/invoice-audits/${id}`, { method: 'DELETE' }),
};
