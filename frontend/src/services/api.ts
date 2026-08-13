const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('edunexus_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('edunexus_token', token);
}

export function clearAuthToken() {
  localStorage.removeItem('edunexus_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'An unexpected error occurred';
    try {
      const errorData = await response.json();
      errorMsg = errorData.detail || errorData.message || errorMsg;
    } catch (e) {
      // Ignore JSON parse errors
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  get: <T>(url: string, headers?: Record<string, string>) => request<T>(url, { method: 'GET', headers }),
  post: <T>(url: string, data?: any) => request<T>(url, { method: 'POST', body: JSON.stringify(data) }),
  patch: <T>(url: string, data?: any) => request<T>(url, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};
