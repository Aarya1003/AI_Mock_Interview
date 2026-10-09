const API_BASE = 'http://localhost:8080/api';

class ApiError extends Error {
  constructor(
    public status: number,
    public data: any,
    public userMessage: string = 'Something went wrong',
    public code: string = 'UNKNOWN'
  ) {
    super(userMessage);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  console.log(`API Request: ${options.method || 'GET'} ${API_BASE}${path}`, { hasToken: !!token });
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  console.log(`API Response: ${res.status}`, data);

  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new ApiError(res.status, data, 'Session expired. Please log in again.', 'UNAUTHORIZED');
  }

  if (!res.ok) {
    const errorMessage = data?.error || data?.message || 'Unknown error';
    const errorCode = data?.code || 'UNKNOWN';
    throw new ApiError(res.status, data, errorMessage, errorCode);
  }
  return data;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: any) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: any) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export { ApiError };