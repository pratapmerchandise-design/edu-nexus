const env = import.meta.env as any;
const API_BASE = env.VITE_API_BASE || '/api';

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
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  } else if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

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
      let parsedDetail = errorData.detail;
      if (Array.isArray(parsedDetail)) {
        parsedDetail = parsedDetail.map((err: any) => `${err.loc?.[err.loc.length - 1] || 'Field'}: ${err.msg}`).join(', ');
      } else if (typeof parsedDetail === 'object' && parsedDetail !== null) {
        parsedDetail = JSON.stringify(parsedDetail);
      }
      errorMsg = parsedDetail || errorData.message || errorMsg;
    } catch (e) {
      // Ignore JSON parse errors
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  get: <T>(url: string, headers?: Record<string, string>) => request<T>(url, { method: 'GET', headers }),
  post: <T>(url: string, data?: any, options?: RequestInit) => request<T>(url, { method: 'POST', body: data instanceof FormData ? data : JSON.stringify(data), ...options }),
  put: <T>(url: string, data?: any, options?: RequestInit) => request<T>(url, { method: 'PUT', body: data instanceof FormData ? data : JSON.stringify(data), ...options }),
  patch: <T>(url: string, data?: any, options?: RequestInit) => request<T>(url, { method: 'PATCH', body: data instanceof FormData ? data : JSON.stringify(data), ...options }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};

export async function uploadFile(file: File): Promise<{ url: string; name: string; size: number }> {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!response.ok) {
    let errorMsg = 'Upload failed';
    try {
      const data = await response.json();
      errorMsg = data.detail || errorMsg;
    } catch (e) { /* ignore */ }
    throw new Error(errorMsg);
  }
  return response.json();
}
