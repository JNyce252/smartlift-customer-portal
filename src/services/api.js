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

  // ===== Platform admin (super_admin only) =====
  getAdminDashboard: () => request('/admin/dashboard'),
  getAdminTenants:   () => request('/admin/tenants'),
  getAdminActivity:  (params = {}) => {
    const qs = new URLSearchParams();
    if (params.company_id) qs.set('company_id', params.company_id);
    if (params.action)     qs.set('action', params.action);
    if (params.before)     qs.set('before', params.before);
    if (params.limit)      qs.set('limit', params.limit);
    const q = qs.toString();
    return request(`/admin/activity${q ? '?' + q : ''}`);
  },
  // Feedback queue (super_admin). Default returns open + in_review; pass
  // status=all (or any single status) to override. Filter by type/priority/company_id.
  getAdminFeedback: (params = {}) => {
    const qs = new URLSearchParams();
    ['status','type','priority','company_id','limit'].forEach(k => {
      if (params[k] !== undefined && params[k] !== '' && params[k] !== null) qs.set(k, params[k]);
    });
    const q = qs.toString();
    return request(`/admin/feedback${q ? '?' + q : ''}`);
  },
  // Patch one feedback item — status, priority, admin_notes (any subset).
  // Server stamps resolved_at automatically when status is terminal.
  patchAdminFeedback: (id, body) => request(`/admin/feedback/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }),
  // Cross-tenant service-request queue (super_admin). Default = open + in_progress;
  // pass status=open,in_progress,resolved (comma-separated) to filter.
  getAdminServiceRequests: (params = {}) => {
    const qs = new URLSearchParams();
    ['status','priority','company_id','limit'].forEach(k => {
      if (params[k] !== undefined && params[k] !== '' && params[k] !== null) qs.set(k, params[k]);
    });
    const q = qs.toString();
    return request(`/admin/service-requests${q ? '?' + q : ''}`);
  },

  // Submit feedback / feature request / bug report. Authenticated — any role
  // (customer, owner, technician, sales, staff, super_admin) can submit.
  // Lambda emails Jeremy via SES + persists to platform_feedback. Body shape:
  // { type:'feature_request'|'system_issue'|'feedback'|'question',
  //   subject, body, priority?:'low'|'medium'|'high'|'urgent', page_url? }
  submitFeedback: (body) => request('/me/feedback', {
    method: 'POST',
    body: JSON.stringify({
      ...body,
      page_url: body.page_url || (typeof window !== 'undefined' ? window.location.href : null),
    }),
  }),

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
