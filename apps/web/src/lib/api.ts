import { getApiUrl } from '@/lib/config';

export type WidgetTheme = {
  launcherBg: string;
  launcherIcon: string;
  headerBg: string;
  headerTitle: string;
  headerSubtitle: string;
  panelBg: string;
  panelBorder: string;
  messagesBg: string;
  agentBubbleBg: string;
  agentBubbleText: string;
  visitorBubbleBg: string;
  visitorBubbleText: string;
  systemText: string;
  labelText: string;
  inputBg: string;
  inputText: string;
  inputBorder: string;
  inputPlaceholder: string;
  composerBg: string;
  buttonBg: string;
  buttonText: string;
};

export type Inbox = {
  id: string;
  name: string;
  channelType: string;
  widgetColor: string | null;
  widgetIcon?: string | null;
  widgetTheme?: WidgetTheme | null;
  greetingMessage?: string | null;
  welcomeTitle?: string | null;
  welcomeTagline?: string | null;
  isEnabled: boolean;
};

export type Conversation = {
  id: string;
  inboxId: string;
  contactId: string;
  status: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  createdAt: string;
  contactName: string;
  contactEmail: string | null;
  inboxName: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  content: string;
  senderType: 'contact' | 'agent' | 'system';
  senderId: string | null;
  createdAt: string;
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;
  const apiUrl = getApiUrl();

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${apiUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(`Cannot reach the API at ${apiUrl}. Check your connection and try again.`);
  }

  let data: { error?: string };
  try {
    data = await res.json();
  } catch {
    throw new Error(`Unexpected response from API (${res.status}). Try again in a moment.`);
  }

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
      request<
        | {
            user: { id: string; name: string; email: string };
            account: { id: string; name: string; slug: string } | null;
            token: string;
            expiresAt: string;
          }
        | { requiresTwoFactor: true; userId: string }
      >('/auth/sign-in', { method: 'POST', body }),

    googleUrl: () => `${getApiUrl()}/auth/google`,

    signOut: (token: string) => request('/auth/sign-out', { method: 'POST', token }),

    me: (token: string) =>
      request<{
        user: {
          id: string;
          name: string;
          email: string;
          avatarUrl: string | null;
          totpEnabled: boolean;
        };
        account: { id: string; name: string; slug: string } | null;
      }>('/auth/me', { token }),
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

  twoFa: {
    setup: (token: string) =>
      request<{ secret: string; uri: string }>('/auth/2fa/setup', { token }),
    enable: (code: string, token: string) =>
      request<{ backupCodes: string[] }>('/auth/2fa/enable', { method: 'POST', body: { code }, token }),
    disable: (code: string, token: string) =>
      request<{ message: string }>('/auth/2fa/disable', { method: 'POST', body: { code }, token }),
    verify: (userId: string, code: string) =>
      request<{ user: { id: string; name: string; email: string }; account: { id: string; name: string; slug: string } | null; token: string; expiresAt: string }>(
        '/auth/2fa/verify', { method: 'POST', body: { userId, code } }
      ),
  },

  inboxes: {
    list: (accountId: string, token: string) =>
      request<{ inboxes: Inbox[] }>(`/accounts/${accountId}/inboxes`, { token }),
    create: (
      accountId: string,
      body: {
        name: string;
        channelType?: string;
        greetingMessage?: string;
        welcomeTitle?: string;
        welcomeTagline?: string;
        widgetColor?: string;
        widgetIcon?: string;
        widgetTheme?: WidgetTheme;
      },
      token: string
    ) =>
      request<{ inbox: Inbox }>(`/accounts/${accountId}/inboxes`, { method: 'POST', body, token }),
    update: (
      accountId: string,
      inboxId: string,
      body: {
        name?: string;
        greetingMessage?: string | null;
        welcomeTitle?: string | null;
        welcomeTagline?: string | null;
        widgetColor?: string;
        widgetIcon?: string;
        widgetTheme?: WidgetTheme;
        isEnabled?: boolean;
      },
      token: string
    ) =>
      request<{ inbox: Inbox }>(`/accounts/${accountId}/inboxes/${inboxId}`, {
        method: 'PATCH',
        body,
        token,
      }),
    remove: (accountId: string, inboxId: string, token: string) =>
      request<{ message: string }>(`/accounts/${accountId}/inboxes/${inboxId}`, { method: 'DELETE', token }),
  },

  conversations: {
    list: (accountId: string, token: string, params?: { inboxId?: string; status?: string }) => {
      const qs = new URLSearchParams();
      if (params?.inboxId) qs.set('inboxId', params.inboxId);
      if (params?.status) qs.set('status', params.status);
      const query = qs.toString();
      return request<{ conversations: Conversation[] }>(
        `/accounts/${accountId}/conversations${query ? `?${query}` : ''}`,
        { token }
      );
    },

    get: (accountId: string, conversationId: string, token: string) =>
      request<{ conversation: Conversation }>(
        `/accounts/${accountId}/conversations/${conversationId}`,
        { token }
      ),

    listMessages: (accountId: string, conversationId: string, token: string) =>
      request<{ messages: ChatMessage[] }>(
        `/accounts/${accountId}/conversations/${conversationId}/messages`,
        { token }
      ),

    sendMessage: (accountId: string, conversationId: string, content: string, token: string) =>
      request<{ message: ChatMessage }>(
        `/accounts/${accountId}/conversations/${conversationId}/messages`,
        { method: 'POST', body: { content }, token }
      ),

    updateStatus: (
      accountId: string,
      conversationId: string,
      status: 'open' | 'pending' | 'resolved' | 'snoozed',
      token: string
    ) =>
      request<{ conversation: Conversation }>(
        `/accounts/${accountId}/conversations/${conversationId}`,
        { method: 'PATCH', body: { status }, token }
      ),
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
