const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error ?? 'Request failed');
  }

  return data as T;
}

export const api = {
  auth: {
    signUp: (body: { name: string; email: string; password: string; accountName: string }) =>
      request<{ user: { id: string; name: string; email: string }; token: string; expiresAt: string }>(
        '/auth/sign-up',
        { method: 'POST', body }
      ),
    signIn: (body: { email: string; password: string }) =>
      request<{ user: { id: string; name: string; email: string }; token: string; expiresAt: string }>(
        '/auth/sign-in',
        { method: 'POST', body }
      ),
    signOut: (token: string) =>
      request('/auth/sign-out', { method: 'POST', token }),
    me: (token: string) =>
      request<{ user: { id: string; name: string; email: string; avatarUrl: string | null } }>(
        '/auth/me',
        { token }
      ),
  },
};
