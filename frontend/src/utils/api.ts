const API_BASE_URL = 'http://localhost:5000/api';
const SESSION_KEY = 'OfficeBill_session';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  try {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const sess = JSON.parse(raw);
      if (sess.token) {
        headers['Authorization'] = `Bearer ${sess.token}`;
      }
      if (sess.vendorId) {
        headers['x-vendor-id'] = sess.vendorId;
      }
    }
  } catch {}
  return headers;
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const authHeaders = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers,
      },
      ...options,
    });

    const body = await res.json();
    if (!res.ok || !body.ok) {
      return { ok: false, error: body.error || `Server error (${res.status})` };
    }
    return { ok: true, data: body };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Failed to connect to backend server.' };
  }
}
