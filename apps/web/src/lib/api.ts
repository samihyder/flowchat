const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Request failed');
  return data as T;
}

export const api = {
  auth: {
    signUp: (body: { name: string; email: string; password: string; accountName: string }) =>
      request<{
        user: { id: string; name: string; email: string };
        account: { id: string; name: string; slug: string };
        token: string;
        expiresAt: string;
      }>('/auth/sign-up', { method: 'POST', body }),

    signIn: (body: { email: string; password: string }) =>
      request<{
        user: { id: string; name: string; email: string };
        account: { id: string; name: string; slug: string } | null;
        token: string;
        expiresAt: string;
      }>('/auth/sign-in', { method: 'POST', body }),

    signOut: (token: string) => request('/auth/sign-out', { method: 'POST', token }),

    me: (token: string) =>
      request<{ user: { id: string; name: string; email: string; avatarUrl: string | null } }>(
        '/auth/me',
        { token }
      ),
  },

  agents: {
    list: (accountId: string, token: string) =>
      request<{
        agents: {
          userId: string;
          name: string;
          email: string;
          role: string;
          availability: string;
          avatarUrl: string | null;
          isActive: boolean;
          displayName: string | null;
        }[];
      }>(`/accounts/${accountId}/agents`, { token }),

    invite: (accountId: string, body: { email: string; role: 'administrator' | 'agent' }, token: string) =>
      request<{ message: string; agent: { userId: string; name: string; email: string; role: string } }>(
        `/accounts/${accountId}/agents/invite`,
        { method: 'POST', body, token }
      ),

    update: (accountId: string, userId: string, body: { role?: 'administrator' | 'agent'; displayName?: string | null }, token: string) =>
      request<{ agent: unknown }>(`/accounts/${accountId}/agents/${userId}`, {
        method: 'PATCH',
        body,
        token,
      }),

    remove: (accountId: string, userId: string, token: string) =>
      request<{ message: string }>(`/accounts/${accountId}/agents/${userId}`, {
        method: 'DELETE',
        token,
      }),
  },

  account: {
    get: (accountId: string, token: string) =>
      request<{ account: { id: string; name: string; timezone: string; locale: string; logoUrl: string | null; slug: string } }>(
        `/accounts/${accountId}`, { token }
      ),
    update: (accountId: string, body: { name?: string; timezone?: string; locale?: string; logoUrl?: string | null }, token: string) =>
      request<{ account: { id: string; name: string; timezone: string; locale: string; logoUrl: string | null } }>(
        `/accounts/${accountId}`, { method: 'PATCH', body, token }
      ),
    getLogoUploadUrl: (accountId: string, token: string) =>
      request<{ uploadUrl: string; publicUrl: string }>(
        `/accounts/${accountId}/logo-upload-url`, { method: 'POST', token }
      ),
  },

  inboxes: {
    list: (accountId: string, token: string) =>
      request<{ inboxes: { id: string; name: string; channelType: string; widgetColor: string | null; isEnabled: boolean }[] }>(
        `/accounts/${accountId}/inboxes`, { token }
      ),
    create: (accountId: string, body: { name: string; channelType?: string; greetingMessage?: string }, token: string) =>
      request<{ inbox: { id: string; name: string; channelType: string } }>(
        `/accounts/${accountId}/inboxes`, { method: 'POST', body, token }
      ),
    remove: (accountId: string, inboxId: string, token: string) =>
      request<{ message: string }>(`/accounts/${accountId}/inboxes/${inboxId}`, { method: 'DELETE', token }),
  },

  teams: {
    list: (accountId: string, token: string) =>
      request<{ teams: { id: string; name: string; description: string | null; isEnabled: boolean }[] }>(
        `/accounts/${accountId}/teams`,
        { token }
      ),

    create: (accountId: string, body: { name: string; description?: string }, token: string) =>
      request<{ team: { id: string; name: string; description: string | null } }>(
        `/accounts/${accountId}/teams`,
        { method: 'POST', body, token }
      ),

    update: (accountId: string, teamId: string, body: { name?: string; description?: string | null; isEnabled?: boolean }, token: string) =>
      request<{ team: unknown }>(`/accounts/${accountId}/teams/${teamId}`, {
        method: 'PATCH',
        body,
        token,
      }),

    remove: (accountId: string, teamId: string, token: string) =>
      request<{ message: string }>(`/accounts/${accountId}/teams/${teamId}`, {
        method: 'DELETE',
        token,
      }),

    listMembers: (accountId: string, teamId: string, token: string) =>
      request<{ members: { userId: string; name: string; email: string; role: string; availability: string }[] }>(
        `/accounts/${accountId}/teams/${teamId}/members`,
        { token }
      ),

    addMember: (accountId: string, teamId: string, userId: string, token: string) =>
      request<{ message: string }>(`/accounts/${accountId}/teams/${teamId}/members`, {
        method: 'POST',
        body: { userId },
        token,
      }),

    removeMember: (accountId: string, teamId: string, userId: string, token: string) =>
      request<{ message: string }>(`/accounts/${accountId}/teams/${teamId}/members/${userId}`, {
        method: 'DELETE',
        token,
      }),
  },
};
