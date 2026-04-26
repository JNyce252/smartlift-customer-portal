import { authService } from './authService';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';

// Use the ID token — it carries cognito:groups + email which the Lambda decodes.
const getHeaders = () => {
  const token = authService.getIdToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

const request = async (endpoint, options = {}) => {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: getHeaders(),
    ...options
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
};

export const api = {
  getHealth: () => request('/health'),
  getCustomers: () => request('/customers'),
  getElevators: () => request('/elevators'),
  createProspect: (data) => request(`/prospects`, { method: 'POST', body: JSON.stringify(data) }),
  getProspects: () => request('/prospects'),
  getProspect: (id) => request(`/prospects/${id}`),
  getTickets: () => request('/tickets'),
  getMaintenance: () => request('/maintenance'),
  getInvoices: () => request('/invoices'),
  createTicket: (data) => request('/tickets', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
};
