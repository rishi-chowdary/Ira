import {
  API_BASE,
  AdminStats,
  AuthSuccessPayload,
  College,
  DashboardPayload,
  EarningsPoint,
  PendingCollege,
  Transaction,
} from '../types';

export class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  token?: string | null;
  body?: unknown;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');
  if (!headers.has('Content-Type') && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: string }).error)
        : 'Request failed';
    throw new HttpError(message, response.status);
  }

  return payload as T;
}

export const apiClient = {
  request,

  getStats() {
    return request<{ totalLent: number; totalLoans: number; totalUsers: number; totalEarned: number }>(
      '/api/stats',
    );
  },

  signup(payload: {
    full_name: string;
    college_email: string;
    whatsapp_number: string;
    upi_id: string;
    password: string;
  }) {
    return request<{ sessionId: string; message: string }>('/api/auth/signup', {
      method: 'POST',
      body: payload,
    });
  },

  verifySignup(payload: { session_id: string; email_otp: string; whatsapp_otp: string }) {
    return request<AuthSuccessPayload>('/api/auth/verify-signup', {
      method: 'POST',
      body: payload,
    });
  },

  login(email: string, password: string) {
    return request<AuthSuccessPayload>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },

  refresh() {
    return request<AuthSuccessPayload>('/api/auth/refresh', {
      method: 'POST',
    });
  },

  logout() {
    return request<{ ok: boolean }>('/api/auth/logout', {
      method: 'POST',
    });
  },

  requestForgotPassword(email: string) {
    return request<{ sessionId: string }>('/api/auth/forgot-password/request', {
      method: 'POST',
      body: { email },
    });
  },

  verifyForgotPassword(payload: { session_id: string; email_otp: string; whatsapp_otp: string }) {
    return request<{ sessionId: string; resetToken: string }>('/api/auth/forgot-password/verify', {
      method: 'POST',
      body: payload,
    });
  },

  resetPassword(payload: { session_id: string; reset_token: string; password: string }) {
    return request<{ ok: boolean }>('/api/auth/reset-password', {
      method: 'POST',
      body: payload,
    });
  },

  getMe(token: string) {
    return request<DashboardPayload>('/api/users/me', { token });
  },

  updateMode(token: string, mode: 'borrower' | 'lender') {
    return request('/api/users/mode', {
      method: 'PATCH',
      token,
      body: { mode },
    });
  },

  submitKyc(token: string, payload: { aadhaar_number: string; pan_number: string; upi_id: string }) {
    return request('/api/users/onboarding/kyc', {
      method: 'POST',
      token,
      body: payload,
    });
  },

  activateWallet(token: string) {
    return request('/api/users/onboarding/activate-wallet', {
      method: 'POST',
      token,
    });
  },

  registerCollege(payload: PendingCollege['submitted_data']) {
    return request<PendingCollege>('/api/college/register', {
      method: 'POST',
      body: payload,
    });
  },

  collegeLogin(loginCode: string, password: string) {
    return request<AuthSuccessPayload>('/api/college-auth/login', {
      method: 'POST',
      body: { loginCode, password },
    });
  },

  changeCollegePassword(payload: { loginCode: string; currentPassword: string; newPassword: string }) {
    return request<{ ok: boolean }>('/api/college-auth/change-password', {
      method: 'POST',
      body: payload,
    });
  },

  getStates() {
    return request<Array<{ id: number; code: string; name: string }>>('/api/lookup/states');
  },

  getDistricts(stateCode?: string) {
    const search = stateCode ? `?stateCode=${encodeURIComponent(stateCode)}` : '';
    return request<Array<{ id: number; code: string; name: string; stateCode: string }>>(
      `/api/lookup/districts${search}`,
    );
  },

  getUniversities(stateCode?: string, districtCode?: string) {
    const params = new URLSearchParams();
    if (stateCode) params.set('stateCode', stateCode);
    if (districtCode) params.set('districtCode', districtCode);
    const query = params.toString();
    return request<Array<{ id: number; code: string; name: string; shortName?: string }>>(
      `/api/lookup/universities${query ? `?${query}` : ''}`,
    );
  },

  getCollegeStudents(token: string, query = '') {
    return request<Array<Record<string, unknown>>>(`/api/college/students${query}`, {
      token,
    });
  },

  approveCollegeStudent(
    token: string,
    userId: number,
    payload: { enrollment_number: string; course_name: string; year: number },
  ) {
    return request(`/api/college/students/${userId}/approve`, {
      method: 'POST',
      token,
      body: payload,
    });
  },

  rejectCollegeStudent(token: string, userId: number) {
    return request(`/api/college/students/${userId}/reject`, {
      method: 'POST',
      token,
    });
  },

  getAdminStats(token: string) {
    return request<AdminStats>('/api/admin/stats', { token });
  },

  getPendingColleges(token: string) {
    return request<PendingCollege[]>('/api/admin/pending-colleges', { token });
  },

  getEarnings(token: string) {
    return request<EarningsPoint[]>('/api/admin/earnings', { token });
  },

  approveCollege(token: string, pendingCollegeId: number) {
    return request('/api/college/admin/approve', {
      method: 'POST',
      token,
      body: { pendingCollegeId },
    });
  },

  rejectCollege(token: string, pendingCollegeId: number, reason: string) {
    return request('/api/college/admin/reject', {
      method: 'POST',
      token,
      body: { pendingCollegeId, reason },
    });
  },

  requestLoan(token: string, payload: { amount: number; tenure: number; purpose?: string; scheduleFrequency?: string }) {
    return request<{ loan: Record<string, unknown>; matches: Array<Record<string, unknown>> }>(
      '/api/loans/request',
      {
        method: 'POST',
        token,
        body: payload,
      },
    );
  },

  getLoans(token: string) {
    return request<{ loans: import('../types').Loan[]; investments: import('../types').Investment[] }>(
      '/api/loans',
      { token },
    );
  },

  repayLoan(token: string, loanId: number) {
    return request('/api/loans/repay', {
      method: 'POST',
      token,
      body: { loanId },
    });
  },

  getTransactions(token: string, search = '') {
    return request<{ items: Transaction[]; pagination: { page: number; totalPages: number; total: number } }>(
      `/api/transactions${search}`,
      { token },
    );
  },

  getGuarantors(token: string) {
    return request<{
      yourGuarantors: Array<Record<string, unknown>>;
      youAsGuarantor: Array<Record<string, unknown>>;
    }>('/api/guarantors', { token });
  },

  requestGuarantor(token: string, guarantorEmail: string) {
    return request('/api/guarantors/request', {
      method: 'POST',
      token,
      body: { guarantorEmail },
    });
  },

  getNotifications(token: string) {
    return request<Array<{ id: number; title: string; message: string; is_read: boolean; created_at: string }>>(
      '/api/notifications',
      { token },
    );
  },

  respondToGuarantor(token: string, borrowerId: number, action: 'approve' | 'reject') {
    return request(`/api/guarantors/${borrowerId}/${action}`, {
      method: 'POST',
      token,
    });
  },

  getColleges() {
    return request<College[]>('/api/colleges');
  },
};
