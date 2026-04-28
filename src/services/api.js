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

  // B1+B2: Compliance Health Score + Certification Cliff Chart.
  // Returns per-elevator scores, fleet aggregate, TX benchmark, and a 12-month
  // cert-expiration distribution for charting. See docs/CUSTOMER_PORTAL_FEATURES.md.
  getCompliance: () => request('/me/compliance'),

  // A1: Hidden Defect Cohort Predictions for one elevator.
  // Pulls a peer cohort from the TDLR registry, runs Claude analysis, returns
  // structured AI narrative. Cached server-side for 30 days, so first call ~10s,
  // subsequent calls instant. See docs/CUSTOMER_PORTAL_FEATURES.md feature A1.
  getElevatorInsights: (id) => request(`/me/elevator/${id}/insights`),

  // A2: AI Q&A Chat — natural-language questions about customer's own data.
  // Stateless server-side; client sends full message history each call.
  // See docs/CUSTOMER_PORTAL_FEATURES.md feature A2.
  askChat: (messages) => request('/me/chat', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  }),

  // O1: Service History Timeline — unified event list per elevator.
  // See docs/CUSTOMER_PORTAL_FEATURES.md feature O1.
  getElevatorTimeline: (id) => request(`/me/elevator/${id}/timeline`),

  // O2: Renewal Calendar — fetches the customer's .ics and triggers a browser
  // download. Non-JSON response, so this bypasses the standard request() wrapper.
  // See docs/CUSTOMER_PORTAL_FEATURES.md feature O2. (v2: subscribable URL.)
  downloadCalendar: async () => {
    const res = await fetch(`${BASE_URL}/me/calendar.ics`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`Calendar download failed: ${res.status}`);
    const blob = await res.blob();
    const cd = res.headers.get('Content-Disposition') || '';
    const match = cd.match(/filename="?([^";]+)"?/);
    const filename = (match && match[1]) || 'smarterlift-calendar.ics';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
