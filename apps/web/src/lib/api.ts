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
  greetingMessages?: string[] | null;
  welcomeTitle?: string | null;
  welcomeTagline?: string | null;
  websiteUrl?: string | null;
  defaultAssigneeId?: string | null;
  allowedDomains?: string[];
  businessHours?: Record<string, unknown> | null;
  offlineMessage?: string | null;
  privacyPolicyUrl?: string | null;
  requireConsent?: boolean;
  roundRobinEnabled?: boolean;
  useBusinessHours?: boolean;
  missedChatMinutes?: number;
  csatEnabled?: boolean;
  preChatFields?: PreChatField[];
  isEnabled: boolean;
};

export type InboxAnalytics = {
  inbox: {
    id: string;
    name: string;
    websiteUrl: string | null;
    defaultAssigneeId: string | null;
    defaultAssigneeName: string | null;
  };
  range: { from: string; to: string };
  summary: {
    totalVisits: number;
    uniqueVisitors: number;
    totalConversations: number;
    openConversations: number;
    resolvedConversations: number;
    totalMessages: number;
    chatsStarted: number;
    avgFirstResponseMinutes?: number | null;
    avgResolutionMinutes?: number | null;
    missedChatRate?: number | null;
    csatAverage?: number | null;
  };
  daily: { date: string; visits: number; conversations: number; messages: number }[];
  exceptions?: AnalyticsException[];
  activeChats: {
    conversationId: string;
    contactName: string;
    contactEmail: string | null;
    ipAddress: string | null;
    countryCode?: string | null;
    sourceId?: string | null;
    startedAt: string;
    lastMessageAt: string | null;
    unreadCount: number;
    assigneeName: string | null;
    assigneeId: string | null;
  }[];
  recentVisits: {
    ipAddress: string | null;
    countryCode?: string | null;
    userAgent: string | null;
    sourceId: string | null;
    pageUrl: string | null;
    visitedAt: string;
  }[];
};

export type Label = { id: string; name: string; color: string };

export type AnalyticsException = {
  id: string;
  type: 'ip' | 'machine';
  value: string;
  label: string | null;
  createdAt: string;
};

export type Conversation = {
  id: string;
  inboxId: string;
  contactId: string;
  status: 'open' | 'pending' | 'resolved' | 'snoozed';
  priority?: 'urgent' | 'high' | 'medium' | 'low';
  assigneeId?: string | null;
  assigneeName?: string | null;
  snoozedUntil?: string | null;
  labels?: Label[];
  participants?: { userId: string; name: string }[];
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  createdAt: string;
  contactName: string;
  contactEmail: string | null;
  inboxName: string;
};

export type MessageAttachment = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  publicUrl: string | null;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  content: string;
  senderType: 'contact' | 'agent' | 'system';
  senderId: string | null;
  isPrivate?: boolean;
  clientMessageId?: string | null;
  editedAt?: string | null;
  deletedAt?: string | null;
  readAt?: string | null;
  attachments?: MessageAttachment[];
  createdAt: string;
};

export type PreChatField = {
  id: string;
  label: string;
  type: 'text' | 'select';
  required?: boolean;
  options?: string[];
};

export type VisitorContext = {
  contactName: string | null;
  contactEmail: string | null;
  pageUrl: string | null;
  referrer: string | null;
  ipAddress: string | null;
  countryCode: string | null;
  country: string | null;
  device: string;
  browser: string;
  visitCount: number;
  preChatData: Record<string, string>;
  pastChats: { id: string; status: string; createdAt: string; lastMessageAt: string | null }[];
  lastSeenAt: string | null;
};

export type CannedResponse = { id: string; shortcut: string; title: string; content: string };

export type AccountCrmSettings = {
  crmImportEnabled?: boolean;
  crmExportEnabled?: boolean;
  crmImportAllowedUserIds?: string[];
  crmExportAllowedUserIds?: string[];
  leadsnapperSyncEnabled?: boolean;
  leadsnapperMinPriority?: 'Hot' | 'Warm' | 'all';
  marketingFromName?: string;
  marketingFromEmail?: string;
  marketingReplyTo?: string;
  marketingPhysicalAddress?: string;
  marketingDoubleOptIn?: boolean;
};

export type MarketingSender = {
  id: string;
  label: string;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  physicalAddress: string | null;
  isDefault: boolean;
  domainStatus: string;
  createdAt: string;
  updatedAt: string;
};

export type MarketingWorkflowStep = {
  id: string;
  stepOrder: number;
  stepType: string;
  config: Record<string, unknown>;
};

export type MarketingWorkflow = {
  id: string;
  name: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  senderId: string | null;
  enabled: boolean;
  allowReentry: boolean;
  activeEnrollments: number;
  steps: MarketingWorkflowStep[];
  createdAt: string;
  updatedAt: string;
};

export type CustomAttributeDefinition = {
  id: string;
  entityType: 'contact' | 'conversation';
  key: string;
  label: string;
  attrType: 'text' | 'number' | 'date' | 'select' | 'boolean';
  options: string[] | null;
  sortOrder: number;
};

export type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: 'visitor' | 'lead' | 'customer';
  marketingStatus?: string;
  externalId?: string | null;
  labels?: Label[];
  lastActivityAt: string | null;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ContactNote = {
  id: string;
  content: string;
  authorName?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContactDetail = Contact & {
  avatarUrl: string | null;
  blockedAt: string | null;
  externalId?: string | null;
  customAttributes?: Record<string, unknown>;
  labels: Label[];
  conversations: {
    id: string;
    status: string;
    inboxId: string;
    inboxName: string;
    lastMessageAt: string | null;
    createdAt: string;
  }[];
  notes: ContactNote[];
};

export type DuplicateGroup = {
  key: string;
  field: 'email' | 'phone';
  value: string;
  contacts: { id: string; name: string; email: string | null; phone: string | null }[];
};

export type ImportJob = {
  id: string;
  status: string;
  totalRows: number;
  processedRows?: number;
  importedCount?: number;
  skippedCount?: number;
  errors?: { row: number; message: string }[];
};

export type MarketingSegment = {
  id: string;
  name: string;
  segmentType: 'static' | 'dynamic';
  filters: Record<string, unknown>;
  contactCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  htmlBody?: string;
  textBody?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CampaignRates = {
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  deliveryRate: number;
  complaintRate: number;
};

export type EmailCampaign = {
  id: string;
  name: string;
  subject: string;
  status: string;
  templateId: string | null;
  segmentId: string | null;
  segmentName?: string | null;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  complainedCount: number;
  unsubscribedCount: number;
  failedCount: number;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  rates?: CampaignRates;
};

export type ContactEmailEvent = {
  id: string;
  eventType: string;
  subject: string | null;
  campaignId: string | null;
  campaignName?: string | null;
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
        | { pendingApproval: true; accountName?: string }
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
          membershipStatus: string;
          avatarUrl: string | null;
          isActive: boolean;
          displayName: string | null;
        }[];
      }>(`/accounts/${accountId}/agents`, { token }),

    invite: (accountId: string, body: { email: string; role: 'administrator' | 'agent' }, token: string) =>
      request<{
        message: string;
        inviteUrl?: string;
        agent: {
          userId?: string;
          name?: string;
          email: string;
          role: string;
          membershipStatus?: string;
        };
      }>(`/accounts/${accountId}/agents/invite`, { method: 'POST', body, token }),

    update: (
      accountId: string,
      userId: string,
      body: {
        role?: 'administrator' | 'agent';
        displayName?: string | null;
        membershipStatus?: 'pending' | 'active' | 'suspended';
        inboxIds?: string[];
      },
      token: string
    ) =>
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
      request<{
        account: {
          id: string;
          name: string;
          timezone: string;
          locale: string;
          logoUrl: string | null;
          slug: string;
          settings?: AccountCrmSettings & {
            allowedInviteDomains?: string[];
            dataRetentionDays?: number;
            autoMessages?: string[];
            autoWelcomeTitle?: string;
            autoWelcomeTagline?: string;
          };
        };
      }>(`/accounts/${accountId}`, { token }),
    update: (
      accountId: string,
      body: {
        name?: string;
        timezone?: string;
        locale?: string;
        logoUrl?: string | null;
        settings?: AccountCrmSettings & {
          allowedInviteDomains?: string[];
          dataRetentionDays?: number;
          autoMessages?: string[];
          autoWelcomeTitle?: string;
          autoWelcomeTagline?: string;
          marketingFromName?: string;
          marketingFromEmail?: string;
          marketingReplyTo?: string;
          marketingPhysicalAddress?: string;
          marketingDoubleOptIn?: boolean;
        };
      },
      token: string
    ) =>
      request<{
        account: {
          id: string;
          name: string;
          timezone: string;
          locale: string;
          logoUrl: string | null;
          settings?: AccountCrmSettings & {
            allowedInviteDomains?: string[];
            dataRetentionDays?: number;
            autoMessages?: string[];
            autoWelcomeTitle?: string;
            autoWelcomeTagline?: string;
          };
        };
      }>(`/accounts/${accountId}`, { method: 'PATCH', body, token }),
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
        websiteUrl?: string;
        defaultAssigneeId: string;
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
        greetingMessages?: string[];
        welcomeTitle?: string | null;
        welcomeTagline?: string | null;
        widgetColor?: string;
        widgetIcon?: string;
        widgetTheme?: WidgetTheme;
        websiteUrl?: string | null;
        defaultAssigneeId?: string;
        allowedDomains?: string[];
        businessHours?: Record<string, unknown> | null;
        offlineMessage?: string | null;
        privacyPolicyUrl?: string | null;
        requireConsent?: boolean;
        roundRobinEnabled?: boolean;
        useBusinessHours?: boolean;
        missedChatMinutes?: number;
        csatEnabled?: boolean;
        preChatFields?: PreChatField[];
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
    analytics: (
      accountId: string,
      inboxId: string,
      token: string,
      params?: { from?: string; to?: string }
    ) => {
      const qs = new URLSearchParams();
      if (params?.from) qs.set('from', params.from);
      if (params?.to) qs.set('to', params.to);
      const query = qs.toString();
      return request<InboxAnalytics>(
        `/accounts/${accountId}/inboxes/${inboxId}/analytics${query ? `?${query}` : ''}`,
        { token }
      );
    },
    addAnalyticsException: (
      accountId: string,
      inboxId: string,
      body: { type: 'ip' | 'machine'; value: string; label?: string },
      token: string
    ) =>
      request<{ exception: AnalyticsException }>(
        `/accounts/${accountId}/inboxes/${inboxId}/analytics/exceptions`,
        { method: 'POST', body, token }
      ),
    removeAnalyticsException: (
      accountId: string,
      inboxId: string,
      exceptionId: string,
      token: string
    ) =>
      request<{ ok: boolean }>(
        `/accounts/${accountId}/inboxes/${inboxId}/analytics/exceptions/${exceptionId}`,
        { method: 'DELETE', token }
      ),
  },

  labels: {
    list: (accountId: string, token: string) =>
      request<{ labels: Label[] }>(`/accounts/${accountId}/labels`, { token }),
    create: (accountId: string, body: { name: string; color?: string }, token: string) =>
      request<{ label: Label }>(`/accounts/${accountId}/labels`, { method: 'POST', body, token }),
  },

  conversations: {
    list: (
      accountId: string,
      token: string,
      params?: {
        inboxId?: string;
        status?: string;
        filter?: 'mine' | 'unassigned';
        priority?: string;
        labelId?: string;
        from?: string;
        to?: string;
      }
    ) => {
      const qs = new URLSearchParams();
      if (params?.inboxId) qs.set('inboxId', params.inboxId);
      if (params?.status) qs.set('status', params.status);
      if (params?.filter) qs.set('filter', params.filter);
      if (params?.priority) qs.set('priority', params.priority);
      if (params?.labelId) qs.set('labelId', params.labelId);
      if (params?.from) qs.set('from', params.from);
      if (params?.to) qs.set('to', params.to);
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

    listMessages: (
      accountId: string,
      conversationId: string,
      token: string,
      params?: { before?: string; limit?: number }
    ) => {
      const qs = new URLSearchParams();
      if (params?.before) qs.set('before', params.before);
      if (params?.limit) qs.set('limit', String(params.limit));
      const query = qs.toString();
      return request<{ messages: ChatMessage[]; nextCursor: string | null }>(
        `/accounts/${accountId}/conversations/${conversationId}/messages${query ? `?${query}` : ''}`,
        { token }
      );
    },

    sendMessage: (
      accountId: string,
      conversationId: string,
      body: {
        content: string;
        isPrivate?: boolean;
        clientMessageId?: string;
        attachments?: {
          storageKey: string;
          filename: string;
          contentType: string;
          sizeBytes: number;
          publicUrl?: string | null;
        }[];
      },
      token: string
    ) =>
      request<{ message: ChatMessage }>(
        `/accounts/${accountId}/conversations/${conversationId}/messages`,
        { method: 'POST', body, token }
      ),

    editMessage: (
      accountId: string,
      conversationId: string,
      messageId: string,
      content: string,
      token: string
    ) =>
      request<{ message: ChatMessage }>(
        `/accounts/${accountId}/conversations/${conversationId}/messages/${messageId}`,
        { method: 'PATCH', body: { content }, token }
      ),

    deleteMessage: (accountId: string, conversationId: string, messageId: string, token: string) =>
      request<{ message: ChatMessage }>(
        `/accounts/${accountId}/conversations/${conversationId}/messages/${messageId}`,
        { method: 'DELETE', token }
      ),

    attachmentUploadUrl: (
      accountId: string,
      conversationId: string,
      body: { filename: string; contentType: string; sizeBytes: number },
      token: string
    ) =>
      request<{ uploadUrl: string; publicUrl: string | null; storageKey: string }>(
        `/accounts/${accountId}/conversations/${conversationId}/attachments/upload-url`,
        { method: 'POST', body, token }
      ),

    visitorContext: (accountId: string, conversationId: string, token: string) =>
      request<{ context: VisitorContext }>(
        `/accounts/${accountId}/conversations/${conversationId}/visitor-context`,
        { token }
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

    update: (
      accountId: string,
      conversationId: string,
      body: {
        status?: 'open' | 'pending' | 'resolved' | 'snoozed';
        assigneeId?: string | null;
        priority?: 'urgent' | 'high' | 'medium' | 'low';
        snoozedUntil?: string | null;
        labelIds?: string[];
        participantIds?: string[];
        blockContact?: boolean;
        blockIp?: boolean;
      },
      token: string
    ) =>
      request<{ conversation: Conversation }>(
        `/accounts/${accountId}/conversations/${conversationId}`,
        { method: 'PATCH', body, token }
      ),
  },

  contacts: {
    list: (
      accountId: string,
      token: string,
      params?: {
        q?: string;
        type?: string;
        labelId?: string;
        marketingStatus?: string;
        ids?: string[];
        sort?: string;
        order?: string;
        limit?: number;
        offset?: number;
      }
    ) => {
      const qs = new URLSearchParams();
      if (params?.q) qs.set('q', params.q);
      if (params?.type) qs.set('type', params.type);
      if (params?.labelId) qs.set('labelId', params.labelId);
      if (params?.marketingStatus) qs.set('marketingStatus', params.marketingStatus);
      if (params?.ids?.length) qs.set('ids', params.ids.join(','));
      if (params?.sort) qs.set('sort', params.sort);
      if (params?.order) qs.set('order', params.order);
      if (params?.limit) qs.set('limit', String(params.limit));
      if (params?.offset) qs.set('offset', String(params.offset));
      const query = qs.toString();
      return request<{ contacts: Contact[]; total: number }>(
        `/accounts/${accountId}/contacts${query ? `?${query}` : ''}`,
        { token }
      );
    },

    get: (accountId: string, contactId: string, token: string) =>
      request<{
        contact: ContactDetail;
        labels: Label[];
        conversations: ContactDetail['conversations'];
        notes: ContactNote[];
      }>(`/accounts/${accountId}/contacts/${contactId}`, { token }),

    create: (
      accountId: string,
      body: {
        name: string;
        email?: string | null;
        phone?: string | null;
        type?: string;
        labelIds?: string[];
        customAttributes?: Record<string, unknown>;
      },
      token: string
    ) => request<{ contact: Contact }>(`/accounts/${accountId}/contacts`, { method: 'POST', body, token }),

    update: (
      accountId: string,
      contactId: string,
      body: {
        name?: string;
        email?: string | null;
        phone?: string | null;
        type?: string;
        labelIds?: string[];
        customAttributes?: Record<string, unknown>;
      },
      token: string
    ) =>
      request<{ contact: Contact }>(`/accounts/${accountId}/contacts/${contactId}`, {
        method: 'PATCH',
        body,
        token,
      }),

    remove: (accountId: string, contactId: string, token: string) =>
      request<{ ok: boolean }>(`/accounts/${accountId}/contacts/${contactId}`, { method: 'DELETE', token }),

    listDuplicates: (accountId: string, token: string) =>
      request<{ groups: DuplicateGroup[] }>(`/accounts/${accountId}/contacts/duplicates`, { token }),

    merge: (accountId: string, primaryId: string, secondaryId: string, token: string) =>
      request<{ contact: Contact }>(`/accounts/${accountId}/contacts/merge`, {
        method: 'POST',
        body: { primaryId, secondaryId },
        token,
      }),

    addNote: (accountId: string, contactId: string, content: string, token: string) =>
      request<{ note: ContactNote }>(`/accounts/${accountId}/contacts/${contactId}/notes`, {
        method: 'POST',
        body: { content },
        token,
      }),

    updateNote: (accountId: string, contactId: string, noteId: string, content: string, token: string) =>
      request<{ note: ContactNote }>(`/accounts/${accountId}/contacts/${contactId}/notes/${noteId}`, {
        method: 'PATCH',
        body: { content },
        token,
      }),

    deleteNote: (accountId: string, contactId: string, noteId: string, token: string) =>
      request<{ ok: boolean }>(`/accounts/${accountId}/contacts/${contactId}/notes/${noteId}`, {
        method: 'DELETE',
        token,
      }),

    access: (accountId: string, token: string) =>
      request<{
        importEnabled: boolean;
        exportEnabled: boolean;
        canImport: boolean;
        canExport: boolean;
        isAdmin: boolean;
      }>(`/accounts/${accountId}/contacts/access`, { token }),

    startImportJob: async (
      accountId: string,
      file: File,
      token: string,
      options?: { columnMapping?: Record<string, unknown>; upsertByEmail?: boolean }
    ) => {
      const form = new FormData();
      form.append('file', file);
      if (options?.columnMapping) {
        form.append('columnMapping', JSON.stringify(options.columnMapping));
      }
      if (options?.upsertByEmail) form.append('upsertByEmail', 'true');
      const apiUrl = (await import('@/lib/config')).getApiUrl();
      const res = await fetch(`${apiUrl}/accounts/${accountId}/contacts/import/jobs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Import failed');
      return data as { job: ImportJob };
    },

    pollImportJob: (accountId: string, jobId: string, token: string) =>
      request<{ job: ImportJob; done: boolean }>(
        `/accounts/${accountId}/contacts/import/jobs/${jobId}`,
        { token }
      ),

    downloadImportErrors: async (accountId: string, jobId: string, token: string) => {
      const apiUrl = (await import('@/lib/config')).getApiUrl();
      const res = await fetch(
        `${apiUrl}/accounts/${accountId}/contacts/import/jobs/${jobId}?download=errors`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed to download errors');
      return res.blob();
    },

    importCsv: async (accountId: string, file: File, token: string) => {
      const form = new FormData();
      form.append('file', file);
      const apiUrl = (await import('@/lib/config')).getApiUrl();
      const res = await fetch(`${apiUrl}/accounts/${accountId}/contacts/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Import failed');
      return data as { imported: number; skipped: number; errors: { row: number; message: string }[] };
    },

    exportCsv: async (
      accountId: string,
      token: string,
      params?: { q?: string; type?: string; labelId?: string; ids?: string[] }
    ) => {
      const qs = new URLSearchParams();
      if (params?.q) qs.set('q', params.q);
      if (params?.type) qs.set('type', params.type);
      if (params?.labelId) qs.set('labelId', params.labelId);
      if (params?.ids?.length) qs.set('ids', params.ids.join(','));
      const query = qs.toString();
      const apiUrl = (await import('@/lib/config')).getApiUrl();
      const res = await fetch(
        `${apiUrl}/accounts/${accountId}/contacts/export${query ? `?${query}` : ''}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Export failed');
      }
      return res.blob();
    },

    listEmailEvents: (accountId: string, contactId: string, token: string) =>
      request<{ events: ContactEmailEvent[] }>(
        `/accounts/${accountId}/contacts/${contactId}/email-events`,
        { token }
      ),
  },

  marketing: {
    senders: {
      list: (accountId: string, token: string) =>
        request<{ senders: MarketingSender[] }>(`/accounts/${accountId}/marketing/senders`, { token }),
      create: (
        accountId: string,
        body: {
          label: string;
          fromName: string;
          fromEmail: string;
          replyTo?: string;
          physicalAddress?: string;
          isDefault?: boolean;
        },
        token: string
      ) =>
        request<{ sender: MarketingSender }>(`/accounts/${accountId}/marketing/senders`, {
          method: 'POST',
          body,
          token,
        }),
      update: (
        accountId: string,
        senderId: string,
        body: Partial<{
          label: string;
          fromName: string;
          fromEmail: string;
          replyTo: string | null;
          physicalAddress: string | null;
          isDefault: boolean;
        }>,
        token: string
      ) =>
        request<{ sender: MarketingSender }>(`/accounts/${accountId}/marketing/senders/${senderId}`, {
          method: 'PATCH',
          body,
          token,
        }),
      delete: (accountId: string, senderId: string, token: string) =>
        request<{ ok: boolean }>(`/accounts/${accountId}/marketing/senders/${senderId}`, {
          method: 'DELETE',
          token,
        }),
    },

    segments: {
      list: (accountId: string, token: string) =>
        request<{ segments: MarketingSegment[] }>(`/accounts/${accountId}/marketing/segments`, { token }),
      create: (
        accountId: string,
        body: { name: string; segmentType?: string; filters?: Record<string, unknown> },
        token: string
      ) =>
        request<{ segment: MarketingSegment }>(`/accounts/${accountId}/marketing/segments`, {
          method: 'POST',
          body,
          token,
        }),
      preview: (accountId: string, segmentId: string, token: string) =>
        request<{ preview: { id: string; name: string; email: string }[] }>(
          `/accounts/${accountId}/marketing/segments/${segmentId}`,
          { token }
        ),
      delete: (accountId: string, segmentId: string, token: string) =>
        request<{ ok: boolean }>(`/accounts/${accountId}/marketing/segments/${segmentId}`, {
          method: 'DELETE',
          token,
        }),
      addMembers: (accountId: string, segmentId: string, contactIds: string[], token: string) =>
        request<{ ok: boolean }>(`/accounts/${accountId}/marketing/segments/${segmentId}/members`, {
          method: 'POST',
          body: { contactIds },
          token,
        }),
    },

    suppressions: {
      list: (accountId: string, token: string) =>
        request<{ suppressions: { id: string; email: string; reason: string; createdAt: string }[] }>(
          `/accounts/${accountId}/marketing/suppressions`,
          { token }
        ),
      add: (accountId: string, email: string, token: string, reason?: string) =>
        request<{ ok: boolean }>(`/accounts/${accountId}/marketing/suppressions`, {
          method: 'POST',
          body: { email, reason },
          token,
        }),
    },

    templates: {
      list: (accountId: string, token: string) =>
        request<{ templates: EmailTemplate[] }>(`/accounts/${accountId}/marketing/templates`, { token }),
      create: (
        accountId: string,
        body: { name: string; subject: string; htmlBody: string; textBody?: string },
        token: string
      ) =>
        request<{ template: EmailTemplate }>(`/accounts/${accountId}/marketing/templates`, {
          method: 'POST',
          body,
          token,
        }),
      testSend: (
        accountId: string,
        templateId: string,
        body: { to?: string; senderId?: string },
        token: string
      ) =>
        request<{ ok: boolean; sentTo: string }>(
          `/accounts/${accountId}/marketing/templates/${templateId}/test-send`,
          { method: 'POST', body, token }
        ),
      get: (accountId: string, templateId: string, token: string) =>
        request<{ template: EmailTemplate }>(`/accounts/${accountId}/marketing/templates/${templateId}`, {
          token,
        }),
      duplicate: (accountId: string, templateId: string, token: string) =>
        request<{ template: EmailTemplate }>(
          `/accounts/${accountId}/marketing/templates/${templateId}/duplicate`,
          { method: 'POST', token }
        ),
      archive: (accountId: string, templateId: string, token: string) =>
        request<{ template: EmailTemplate }>(`/accounts/${accountId}/marketing/templates/${templateId}`, {
          method: 'PATCH',
          body: { archived: true },
          token,
        }),
    },

    campaigns: {
      list: (accountId: string, token: string) =>
        request<{ campaigns: EmailCampaign[] }>(`/accounts/${accountId}/marketing/campaigns`, { token }),
      get: (accountId: string, campaignId: string, token: string) =>
        request<{
          campaign: EmailCampaign;
          statusBreakdown: { status: string; count: number }[];
          abStats?: { variant: string; sent: number; opened: number }[];
        }>(`/accounts/${accountId}/marketing/campaigns/${campaignId}`, { token }),
      create: (
        accountId: string,
        body: {
          name: string;
          subject: string;
          templateId?: string;
          segmentId?: string;
          senderId?: string;
          scheduledAt?: string;
          abTestEnabled?: boolean;
          subjectVariantB?: string;
          useSendTimeOptimization?: boolean;
        },
        token: string
      ) =>
        request<{ campaign: EmailCampaign }>(`/accounts/${accountId}/marketing/campaigns`, {
          method: 'POST',
          body,
          token,
        }),
      send: (accountId: string, campaignId: string, token: string) =>
        request<{ totalRecipients: number; done: boolean; processed: number }>(
          `/accounts/${accountId}/marketing/campaigns/${campaignId}/send`,
          { method: 'POST', token }
        ),
      process: (accountId: string, campaignId: string, token: string) =>
        request<{ done: boolean; processed: number }>(
          `/accounts/${accountId}/marketing/campaigns/${campaignId}/process`,
          { method: 'POST', token }
        ),
      schedule: (accountId: string, campaignId: string, scheduledAt: string, token: string) =>
        request<{ ok: boolean }>(`/accounts/${accountId}/marketing/campaigns/${campaignId}/schedule`, {
          method: 'POST',
          body: { scheduledAt },
          token,
        }),
      control: (accountId: string, campaignId: string, action: 'pause' | 'cancel', token: string) =>
        request<{ ok: boolean }>(`/accounts/${accountId}/marketing/campaigns/${campaignId}/control`, {
          method: 'POST',
          body: { action },
          token,
        }),
    },

    workflows: {
      list: (accountId: string, token: string) =>
        request<{ workflows: MarketingWorkflow[] }>(`/accounts/${accountId}/marketing/workflows`, { token }),
      create: (
        accountId: string,
        body: {
          name: string;
          triggerType?: string;
          triggerConfig?: Record<string, unknown>;
          senderId?: string;
          allowReentry?: boolean;
          steps?: { stepType: string; config: Record<string, unknown> }[];
        },
        token: string
      ) =>
        request<{ workflowId: string }>(`/accounts/${accountId}/marketing/workflows`, {
          method: 'POST',
          body,
          token,
        }),
      enroll: (accountId: string, workflowId: string, contactId: string, token: string) =>
        request<{ ok: boolean }>(`/accounts/${accountId}/marketing/workflows/${workflowId}/enroll`, {
          method: 'POST',
          body: { contactId },
          token,
        }),
      process: (accountId: string, token: string) =>
        request<{ processed: number }>(`/accounts/${accountId}/marketing/workflows/process`, {
          method: 'POST',
          token,
        }),
      update: (
        accountId: string,
        workflowId: string,
        body: { enabled?: boolean; name?: string; allowReentry?: boolean; maxEnrollments?: number | null },
        token: string
      ) =>
        request<{ workflow: MarketingWorkflow }>(
          `/accounts/${accountId}/marketing/workflows/${workflowId}`,
          { method: 'PATCH', body, token }
        ),
    },
  },

  customAttributes: {
    list: (accountId: string, token: string, entityType = 'contact') =>
      request<{ definitions: CustomAttributeDefinition[] }>(
        `/accounts/${accountId}/custom-attributes?entityType=${entityType}`,
        { token }
      ),

    create: (
      accountId: string,
      body: {
        label: string;
        key?: string;
        entityType?: string;
        attrType?: string;
        options?: string[];
        sortOrder?: number;
      },
      token: string
    ) =>
      request<{ definition: CustomAttributeDefinition }>(
        `/accounts/${accountId}/custom-attributes`,
        { method: 'POST', body, token }
      ),

    remove: (accountId: string, definitionId: string, token: string) =>
      request<{ ok: boolean }>(`/accounts/${accountId}/custom-attributes/${definitionId}`, {
        method: 'DELETE',
        token,
      }),
  },

  crm: {
    leadsnapper: {
      get: (accountId: string, token: string) =>
        request<{
          leadsnapperSyncEnabled: boolean;
          leadsnapperMinPriority: 'Hot' | 'Warm' | 'all';
        }>(`/accounts/${accountId}/crm/leadsnapper/provision`, { token }),

      provision: (
        accountId: string,
        body: {
          leadsnapperSyncEnabled?: boolean;
          leadsnapperMinPriority?: 'Hot' | 'Warm' | 'all';
          provisionAttributes?: boolean;
        },
        token: string
      ) =>
        request<{
          settings: { leadsnapperSyncEnabled: boolean; leadsnapperMinPriority: 'Hot' | 'Warm' | 'all' };
          attributes: { created: number; updated: number } | null;
        }>(`/accounts/${accountId}/crm/leadsnapper/provision`, { method: 'POST', body, token }),
    },
  },

  search: {
    conversations: (accountId: string, q: string, token: string) =>
      request<{
        results: {
          id: string;
          status: string;
          lastMessageAt: string | null;
          contactName: string;
          contactEmail: string | null;
          inboxName: string;
        }[];
      }>(`/accounts/${accountId}/search?q=${encodeURIComponent(q)}`, { token }),
  },

  cannedResponses: {
    list: (accountId: string, token: string, q?: string) => {
      const qs = q ? `?q=${encodeURIComponent(q)}` : '';
      return request<{ responses: CannedResponse[] }>(
        `/accounts/${accountId}/canned-responses${qs}`,
        { token }
      );
    },
    create: (
      accountId: string,
      body: { shortcut: string; title: string; content: string },
      token: string
    ) =>
      request<{ response: CannedResponse }>(`/accounts/${accountId}/canned-responses`, {
        method: 'POST',
        body,
        token,
      }),
  },

  webhooks: {
    list: (accountId: string, token: string) =>
      request<{ webhooks: { id: string; url: string; events: string[]; enabled: boolean }[] }>(
        `/accounts/${accountId}/webhooks`,
        { token }
      ),
    create: (accountId: string, body: { url: string; events?: string[] }, token: string) =>
      request<{ webhook: { id: string; url: string; secret: string; events: string[] } }>(
        `/accounts/${accountId}/webhooks`,
        { method: 'POST', body, token }
      ),
  },

  apiKeys: {
    list: (accountId: string, token: string) =>
      request<{
        apiKeys: {
          id: string;
          name: string;
          keyPrefix: string;
          scopes: string[];
          enabled: boolean;
          createdAt: string;
          lastUsedAt: string | null;
        }[];
      }>(`/accounts/${accountId}/api-keys`, { token }),

    create: (
      accountId: string,
      body: { name?: string; scopes?: string[] },
      token: string
    ) =>
      request<{
        apiKey: { id: string; name: string; keyPrefix: string; scopes: string[] };
        secret: string;
      }>(`/accounts/${accountId}/api-keys`, { method: 'POST', body, token }),

    remove: (accountId: string, keyId: string, token: string) =>
      request<{ ok: boolean }>(`/accounts/${accountId}/api-keys/${keyId}`, { method: 'DELETE', token }),
  },

  auditLogs: {
    list: (accountId: string, token: string) =>
      request<{
        logs: {
          id: string;
          action: string;
          resourceType: string;
          resourceId: string | null;
          metadata: Record<string, unknown>;
          createdAt: string;
          actorName: string | null;
          actorEmail: string | null;
        }[];
      }>(`/accounts/${accountId}/audit-logs`, { token }),
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
