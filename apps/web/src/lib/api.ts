import { getApiUrl } from '@/lib/config';
import { marketingErrorFromResponse } from '@/lib/marketing/error-messages';

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
  agentCount?: number;
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

export type AdminWorkspace = {
  id: string;
  name: string;
  slug: string;
  status: string;
  logoUrl: string | null;
  createdAt: string;
  userCount: number;
  contactCount: number;
  inboxCount: number;
};

export type ApiCatalogEndpoint = {
  path: string;
  method: string;
  filePath: string;
  descriptionHtml: string;
  updatedAt: string | null;
};

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

export type CannedResponse = {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  createdByName?: string | null;
};

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
  marketingByokOnly?: boolean;
  marketingEmailSignature?: string;
  marketingCalendlyUrl?: string;
  marketingCalendlyTemplate?: string;
  marketingPortfolioUrl?: string;
  marketingPortfolioTemplate?: string;
  marketingAutoAppendTemplates?: boolean;
  aiCredentialId?: string;
  aiModel?: string;
  widgetAiEnabled?: boolean;
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
  credentialId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ServiceCredential = {
  id: string;
  accountId: string;
  category: 'email_marketing' | 'ai_chat' | 'data_enrichment';
  provider: string;
  label: string;
  secretPrefix: string;
  config: Record<string, unknown>;
  status: 'active' | 'invalid' | 'revoked';
  isDefault: boolean;
  lastVerifiedAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  webhookUrl?: string | null;
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
  required: boolean;
};

export type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  country?: string | null;
  type: 'visitor' | 'lead' | 'customer';
  marketingStatus?: string;
  externalId?: string | null;
  labels?: Label[];
  activeAutomation?: { name: string; currentStep: number; totalSteps: number } | null;
  lastActivityAt: string | null;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
};

export type {
  DasAsset,
  DasAssetKind,
  DasAuditLog,
  DasBrandProfile,
  DasCatalogComponent,
  DasCatalogItem,
  DasCatalogItemType,
  DasCatalogPrice,
  DasClient,
  DasDocumentType,
  DasDocumentStatus,
  DasPriceMode,
  DasTemplate,
} from '@/lib/das/types';

import type {
  DasAsset,
  DasAuditLog,
  DasBrandProfile,
  DasCatalogComponent,
  DasCatalogItem,
  DasCatalogItemType,
  DasCatalogPrice,
  DasClient,
  DasTemplate,
} from '@/lib/das/types';

export type DasDocument = {
  id: string;
  accountId: string;
  contactId: string | null;
  clientId: string | null;
  templateId: string | null;
  type: 'quotation' | 'invoice' | 'proposal' | 'sla' | 'nda' | 'other';
  title: string;
  status:
    | 'draft'
    | 'pending_approval'
    | 'approved'
    | 'rejected'
    | 'finalized'
    | 'archived';
  structuredData: Record<string, unknown>;
  htmlSnapshot: string | null;
  createdBy: string | null;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
  contactName?: string | null;
};

export type DasDocumentSecurity = {
  verificationToken: string;
  sha256Hash: string;
  verifyUrl: string;
  artifactUrl: string | null;
};

export type DasNotification = {
  id: string;
  accountId: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type DasVerifyResult = {
  valid: boolean;
  hashMatches: boolean;
  verificationToken: string;
  sha256Hash: string;
  document: {
    id: string;
    title: string;
    type: string;
    status: string;
    finalizedAt: string | null;
    htmlSnapshot: string | null;
  };
  brand: { legalName: string | null };
  artifactUrl: string | null;
  verifiedAt: string;
};

export type DasCatalogInput = {
  sku?: string;
  skuAuto?: boolean;
  name: string;
  description?: string | null;
  baseUnit?: string | null;
  unitPrice?: number;
  currency?: string;
  priceMode?: 'fixed' | 'rollup';
};

export type ContactNote = {
  id: string;
  content: string;
  authorName?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GlobalCompanySummary = {
  id: string;
  domain: string;
  name: string;
  website: string | null;
  logoUrl: string | null;
  hqCity: string | null;
  hqCountry: string | null;
  enrichmentStatus: string;
};

export type EnrichmentSuggestionField = {
  key: string;
  label: string;
  entity: 'contact' | 'company' | 'person';
  current: string | null;
  proposed: string;
  source: string;
};

export type EnrichmentSuggestion = {
  id: string;
  provider: string;
  providerLabel: string;
  scope: 'company' | 'person' | 'both';
  status: 'pending' | 'applied' | 'dismissed' | 'expired';
  fields: EnrichmentSuggestionField[];
  fetchedAt: string;
  expiresAt: string;
};

export type ContactDetail = Contact & {
  avatarUrl: string | null;
  blockedAt: string | null;
  externalId?: string | null;
  customAttributes?: Record<string, unknown>;
  company?: GlobalCompanySummary | null;
  enrichmentStatus?: string | null;
  enrichmentProvider?: string | null;
  enrichedAt?: string | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
  teamId?: string | null;
  teamName?: string | null;
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

export type ContactTask = {
  id: string;
  title: string;
  dueAt: string | null;
  status: 'open' | 'done';
  createdAt: string;
  completedAt: string | null;
  createdByName?: string | null;
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
  category?: string | null;
  campaignCount?: number;
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

/** S6M wizard campaign (marketing_campaigns table) */
export type MarketingCampaign = {
  id: string;
  name: string;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
  currentStep: number;
  createdBy: string | null;
  createdByName?: string | null;
  stepCount?: number;
  createdAt: string;
  updatedAt: string;
  launchedBy: string | null;
  launchedAt: string | null;
  recipientCount: number;
  scheduleTimezone: string;
  scheduleMode: 'campaign' | 'recipient_local';
  nextScheduledAt?: string | null;
  firstSendAt?: string | null;
  sendRateEnabled: boolean;
  sendRatePerHour: number;
  autoMarkBounced: boolean;
  processUnsubscribes: boolean;
};

export type CampaignRecipientDetail = {
  contactId: string;
  name: string;
  email: string;
  company: string | null;
  marketingStatus: string;
  recipientStatus: 'subscribed' | 'suppressed' | 'no_email';
  exclusionReason: string | null;
};

export type CampaignRecipientsSummary = {
  selected: number;
  suppressed: number;
  reasons?: Record<string, number>;
};

export type CampaignStep = {
  id: string;
  stepOrder: number;
  sendAt: string | null;
  subject: string;
  htmlBody: string;
  plainBody: string | null;
  mergeConfig: {
    contactMessageMode: 'latest_note' | 'latest_inbound_chat' | 'latest_note_or_chat' | null;
  };
  saveAsTemplate: boolean;
  templateName: string | null;
  sourceTemplateId: string | null;
};

export type CampaignSenderConfig = {
  fromName: string | null;
  fromEmail: string | null;
  replyTo: string | null;
  signatureHtml: string | null;
  useWorkspaceSignature: boolean;
  meetingLink: string | null;
  portfolioLink: string | null;
  credentialId: string | null;
  testSentAt: string | null;
  testSentBy: string | null;
  testSentTo: string | null;
};

export type PreflightCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
};

export type PreflightResult = {
  checks: PreflightCheck[];
  testValid: boolean;
  ready: boolean;
};

export type CampaignControlPreview = {
  pendingSends: number;
  queuedRecipients: number;
  nextScheduledAt: string | null;
};

export type CampaignStatsOverview = {
  totalRecipients: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  pending: number;
  stoppedBounce: number;
  stoppedUnsubscribe: number;
  stoppedReply: number;
  stoppedComplaint: number;
  progressPercent: number;
};

export type CampaignStepStats = {
  stepOrder: number;
  subject: string;
  sendAt: string | null;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  stopped: number;
  pending: number;
};

export type CampaignRecipientStats = {
  recipientId: string;
  contactId: string;
  name: string;
  email: string;
  stoppedReason: string | null;
  steps: { stepOrder: number; status: string; sentAt: string | null }[];
};

export type CampaignActivityEvent = {
  id: string;
  eventType: string;
  createdAt: string;
  payload: Record<string, unknown>;
};

export type CampaignStatsResult = {
  overview: CampaignStatsOverview;
  steps: CampaignStepStats[];
  recipients: CampaignRecipientStats[];
  activity: CampaignActivityEvent[];
  scheduleTimezone: string;
  scheduleMode: 'campaign' | 'recipient_local';
};

export type EmailAutomation = {
  id: string;
  name: string;
  enabled: boolean;
  createdAt: string;
  contactCount: number;
  completedCount: number;
  emailCount: number;
  emailsSent: number;
};

export type AutomationRecipient = {
  contactId: string;
  name: string;
  email: string | null;
  enrollmentStatus: string;
  currentStepOrder: number;
  nextRunAt: string | null;
  marketingStatus?: string;
  enrolledAt: string;
  completedAt: string | null;
  emailsSent: number;
  opened: boolean;
  clicked: boolean;
  bounced: boolean;
  lastMessageId?: string | null;
  lastProvider?: string | null;
  lastSendError?: string | null;
  lastSentAt?: string | null;
  status: string;
};

export type MarketingEmailRouteInfo =
  | {
      mode: 'connected';
      provider: string;
      label: string;
      secretPrefix: string;
      fromEmail: string;
      credentialId: string;
      lastUsedAt: string | null;
      usageCount: number;
    }
  | { mode: 'platform'; provider: string; fromEmail: string; platformConfigured: boolean }
  | { mode: 'missing'; fromEmail: string; error: string };

export type ContactEmailEvent = {
  id: string;
  eventType: string;
  subject: string | null;
  campaignId: string | null;
  campaignName?: string | null;
  createdAt: string;
};

export type MarketingTimelineEvent = {
  id: string;
  eventType: string;
  campaignId: string;
  campaignName: string;
  stepOrder: number | null;
  subject: string | null;
  status: string | null;
  createdAt: string;
  detail: string | null;
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

  let data: { error?: string; message?: string };
  try {
    data = await res.json();
  } catch {
    throw new Error(`Unexpected response from API (${res.status}). Try again in a moment.`);
  }

  if (!res.ok) {
    throw new Error(marketingErrorFromResponse(data as { code?: string; message?: string; error?: string }));
  }
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

    signIn: (body: { email: string; password: string; rememberMe?: boolean }) =>
      request<
        | {
            user: { id: string; name: string; email: string };
            account: { id: string; name: string; slug: string } | null;
            isSuperAdmin?: boolean;
            token: string;
            expiresAt: string;
          }
        | { requiresTwoFactor: true; userId: string }
        | { pendingApproval: true; accountName?: string }
      >('/auth/sign-in', { method: 'POST', body }),

    forgotPassword: (email: string) =>
      request<{ ok: boolean }>('/auth/forgot-password', { method: 'POST', body: { email } }),

    checkResetToken: (token: string) =>
      request<{ valid: boolean }>(`/auth/reset-password?token=${encodeURIComponent(token)}`),

    resetPassword: (token: string, password: string) =>
      request<{ ok: boolean }>('/auth/reset-password', { method: 'POST', body: { token, password } }),

    workspaces: (token: string) =>
      request<{ workspaces: AdminWorkspace[] }>('/auth/workspaces', { token }),

    selectWorkspace: (accountId: string, token: string) =>
      request<{ account: { id: string; name: string; slug: string } }>('/auth/workspaces/select', {
        method: 'POST',
        body: { accountId },
        token,
      }),

    sessions: {
      list: (token: string) =>
        request<{
          sessions: {
            id: string;
            userAgent: string | null;
            ipAddress: string | null;
            lastSeenAt: string;
            createdAt: string;
            rememberMe: boolean;
            isCurrent: boolean;
          }[];
        }>('/auth/sessions', { token }),
      revoke: (sessionId: string, token: string) =>
        request<{ ok: boolean }>(`/auth/sessions?id=${sessionId}`, { method: 'DELETE', token }),
    },

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
        isSuperAdmin?: boolean;
      }>('/auth/me', { token }),
  },

  admin: {
    apiCatalog: {
      list: (token: string) =>
        request<{ endpoints: ApiCatalogEndpoint[]; total: number }>('/admin/api-catalog', { token }),
      update: (path: string, method: string, descriptionHtml: string, token: string) =>
        request<{ entry: ApiCatalogEndpoint }>('/admin/api-catalog', {
          method: 'PATCH',
          body: { path, method, descriptionHtml },
          token,
        }),
    },
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
          inboxNames: string[];
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
          marketingEmailSignature?: string;
          marketingCalendlyUrl?: string;
          marketingCalendlyTemplate?: string;
          marketingPortfolioUrl?: string;
          marketingPortfolioTemplate?: string;
          marketingAutoAppendTemplates?: boolean;
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
    getLogoUploadUrl: (accountId: string, token: string, contentType?: string) =>
      request<{ uploadUrl: string; publicUrl: string }>(
        `/accounts/${accountId}/logo-upload-url`,
        { method: 'POST', body: contentType ? { contentType } : {}, token }
      ),
    uploadLogo: async (
      accountId: string,
      file: File,
      token: string
    ): Promise<{ account: { logoUrl: string | null }; publicUrl: string }> => {
      const form = new FormData();
      form.append('file', file);
      const apiUrl = getApiUrl();
      let res: Response;
      try {
        res = await fetch(`${apiUrl}/accounts/${accountId}/logo`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
      } catch {
        throw new Error('Logo upload failed — check your connection and try again.');
      }
      const data = (await res.json()) as { error?: string; account?: { logoUrl: string | null }; publicUrl?: string };
      if (!res.ok) throw new Error(data.error ?? 'Logo upload failed');
      if (!data.account || !data.publicUrl) throw new Error('Logo upload failed');
      return { account: data.account, publicUrl: data.publicUrl };
    },
  },

  twoFa: {
    setup: (token: string) =>
      request<{ secret: string; uri: string }>('/auth/2fa/setup', { token }),
    enable: (code: string, token: string) =>
      request<{ backupCodes: string[] }>('/auth/2fa/enable', { method: 'POST', body: { code }, token }),
    disable: (code: string, token: string) =>
      request<{ message: string }>('/auth/2fa/disable', { method: 'POST', body: { code }, token }),
    regenerateBackupCodes: (code: string, token: string) =>
      request<{ backupCodes: string[] }>('/auth/2fa/regenerate-backup-codes', {
        method: 'POST',
        body: { code },
        token,
      }),
    verify: (userId: string, code: string, rememberMe?: boolean) =>
      request<{ user: { id: string; name: string; email: string }; account: { id: string; name: string; slug: string } | null; token: string; expiresAt: string }>(
        '/auth/2fa/verify', { method: 'POST', body: { userId, code, rememberMe } }
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
      request<{ labels: (Label & { createdAt: string; conversationCount: number })[] }>(
        `/accounts/${accountId}/labels`,
        { token }
      ),
    create: (accountId: string, body: { name: string; color?: string }, token: string) =>
      request<{ label: Label }>(`/accounts/${accountId}/labels`, { method: 'POST', body, token }),
    update: (
      accountId: string,
      labelId: string,
      body: { name?: string; color?: string },
      token: string
    ) =>
      request<{ label: Label }>(`/accounts/${accountId}/labels/${labelId}`, {
        method: 'PATCH',
        body,
        token,
      }),
    delete: (accountId: string, labelId: string, token: string) =>
      request<{ ok: boolean }>(`/accounts/${accountId}/labels/${labelId}`, {
        method: 'DELETE',
        token,
      }),
    seedRecommended: (accountId: string, token: string) =>
      request<{
        ok: boolean;
        created: number;
        updated: number;
        skipped: number;
        labels: Label[];
      }>(`/accounts/${accountId}/labels/seed`, { method: 'POST', token }),
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
        teamId?: string;
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
      if (params?.teamId) qs.set('teamId', params.teamId);
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
        country?: string;
        hasAutomation?: string;
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
      if (params?.country) qs.set('country', params.country);
      if (params?.hasAutomation) qs.set('hasAutomation', params.hasAutomation);
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
        country?: string | null;
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
        country?: string | null;
        type?: string;
        labelIds?: string[];
        customAttributes?: Record<string, unknown>;
        assigneeId?: string | null;
        teamId?: string | null;
      },
      token: string
    ) =>
      request<{ contact: Contact }>(`/accounts/${accountId}/contacts/${contactId}`, {
        method: 'PATCH',
        body,
        token,
      }),

    bulkAssign: (
      accountId: string,
      body: { contactIds: string[]; assigneeId?: string | null; teamId?: string | null },
      token: string
    ) =>
      request<{ ok: boolean; updatedCount: number }>(`/accounts/${accountId}/contacts/bulk-assign`, {
        method: 'POST',
        body,
        token,
      }),

    tasks: {
      list: (accountId: string, contactId: string, token: string) =>
        request<{ tasks: ContactTask[] }>(`/accounts/${accountId}/contacts/${contactId}/tasks`, { token }),

      create: (accountId: string, contactId: string, body: { title: string; dueAt?: string | null }, token: string) =>
        request<{ task: ContactTask }>(`/accounts/${accountId}/contacts/${contactId}/tasks`, {
          method: 'POST',
          body,
          token,
        }),

      update: (
        accountId: string,
        contactId: string,
        taskId: string,
        body: { title?: string; dueAt?: string | null; status?: 'open' | 'done' },
        token: string
      ) =>
        request<{ task: ContactTask }>(`/accounts/${accountId}/contacts/${contactId}/tasks/${taskId}`, {
          method: 'PATCH',
          body,
          token,
        }),

      remove: (accountId: string, contactId: string, taskId: string, token: string) =>
        request<{ ok: boolean }>(`/accounts/${accountId}/contacts/${contactId}/tasks/${taskId}`, {
          method: 'DELETE',
          token,
        }),
    },

    getStats: (accountId: string, token: string) =>
      request<{
        stats: { total: number; hasEmail: number; hasPhone: number; inAutomation: number; newThisWeek: number };
      }>(
        `/accounts/${accountId}/contacts/stats`,
        { token }
      ),

    enrich: (
      accountId: string,
      contactId: string,
      body: {
        credentialId?: string;
        scope?: 'company' | 'person' | 'auto';
        useFlow?: boolean;
        requestedFields?: string[];
      },
      token: string
    ) =>
      request<{
        ok: boolean;
        error?: string;
        code?: string;
        flow?: boolean;
        flowId?: string;
        suggestions?: { provider: string; fieldCount: number; suggestionId: string }[];
        scope?: string;
        fieldCount?: number;
        suggestion?: EnrichmentSuggestion;
      }>(`/accounts/${accountId}/contacts/${contactId}/enrich`, { method: 'POST', body, token }),

    listEnrichmentSuggestions: (accountId: string, contactId: string, token: string) =>
      request<{ suggestions: EnrichmentSuggestion[] }>(
        `/accounts/${accountId}/contacts/${contactId}/enrichment-suggestions`,
        { token }
      ),

    applyEnrichmentSuggestion: (
      accountId: string,
      contactId: string,
      suggestionId: string,
      fieldKeys: string[],
      token: string
    ) =>
      request<{ ok: boolean; appliedCount: number; company?: GlobalCompanySummary | null }>(
        `/accounts/${accountId}/contacts/${contactId}/enrichment-suggestions/${suggestionId}`,
        { method: 'POST', body: { fieldKeys }, token }
      ),

    dismissEnrichmentSuggestion: (
      accountId: string,
      contactId: string,
      suggestionId: string,
      token: string
    ) =>
      request<{ ok: boolean }>(
        `/accounts/${accountId}/contacts/${contactId}/enrichment-suggestions/${suggestionId}`,
        { method: 'DELETE', token }
      ),

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
    getMarketingTimeline: (accountId: string, contactId: string, token: string) =>
      request<{ events: MarketingTimelineEvent[] }>(
        `/accounts/${accountId}/contacts/${contactId}/marketing-timeline`,
        { token }
      ),
  },

  blockedVisitors: {
    list: (accountId: string, token: string) =>
      request<{
        entries: { id: string; type: 'ip' | 'contact'; value: string; reason: string | null; blockedAt: string | null }[];
      }>(`/accounts/${accountId}/blocked-visitors`, { token }),
    block: (
      accountId: string,
      body: { type: 'ip'; value: string; reason?: string } | { type: 'contact'; contactId: string; reason?: string },
      token: string
    ) =>
      request<{ entry: { id: string; type: 'ip' | 'contact'; value: string; reason: string | null; blockedAt: string | null } }>(
        `/accounts/${accountId}/blocked-visitors`,
        { method: 'POST', body, token }
      ),
    unblock: (accountId: string, entryId: string, type: 'ip' | 'contact', token: string) =>
      request<{ ok: boolean }>(`/accounts/${accountId}/blocked-visitors/${entryId}?type=${type}`, {
        method: 'DELETE',
        token,
      }),
  },

  marketing: {
    contactMessagePreview: (
      accountId: string,
      contactId: string,
      mode: string,
      token: string
    ) =>
      request<{ text: string; source: 'note' | 'chat' | null; previewAt: string | null }>(
        `/accounts/${accountId}/marketing/contact-message-preview?contactId=${encodeURIComponent(contactId)}&mode=${encodeURIComponent(mode)}`,
        { token }
      ),
    getHealth: (accountId: string, token: string) =>
      request<{
        providerOk: boolean;
        providerLabel: string;
        domainStatus: string;
        domainOk: boolean;
        cronOk: boolean;
        cronLastAt: string | null;
        cronLastProcessed: number;
        cronError: string | null;
        webhookUrl: string | null;
        webhookSigningConfigured?: boolean;
        fromEmail: string;
      }>(`/accounts/${accountId}/marketing/health`, { token }),
    processDue: (accountId: string, token: string) =>
      request<{
        ok: boolean;
        s6mProcessed: number;
        s6mSent: number;
        error?: string;
      }>(`/accounts/${accountId}/marketing/process-due`, { method: 'POST', token }),
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
          credentialId?: string | null;
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
          credentialId?: string | null;
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
        request<{ segment: MarketingSegment; preview: { id: string; name: string; email: string }[] }>(
          `/accounts/${accountId}/marketing/segments/${segmentId}`,
          { token }
        ),
      update: (
        accountId: string,
        segmentId: string,
        body: { name?: string; segmentType?: string; filters?: Record<string, unknown> },
        token: string
      ) =>
        request<{ segment: MarketingSegment }>(`/accounts/${accountId}/marketing/segments/${segmentId}`, {
          method: 'PATCH',
          body,
          token,
        }),
      previewFilters: (
        accountId: string,
        body: { segmentType: string; filters: Record<string, unknown> },
        token: string
      ) =>
        request<{ count: number; preview: { id: string; name: string; email: string }[] }>(
          `/accounts/${accountId}/marketing/segments/preview`,
          { method: 'POST', body, token }
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
        body: { name: string; subject: string; htmlBody: string; textBody?: string; category?: string },
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
      update: (
        accountId: string,
        templateId: string,
        body: {
          name?: string;
          subject?: string;
          htmlBody?: string;
          textBody?: string;
          category?: string | null;
        },
        token: string
      ) =>
        request<{ template: EmailTemplate }>(`/accounts/${accountId}/marketing/templates/${templateId}`, {
          method: 'PATCH',
          body,
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
      list: (
        accountId: string,
        token: string,
        params?: {
          page?: number;
          pageSize?: number;
          status?: string;
          q?: string;
        }
      ) => {
        const qs = new URLSearchParams();
        if (params?.page) qs.set('page', String(params.page));
        if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
        if (params?.status) qs.set('status', params.status);
        if (params?.q) qs.set('q', params.q);
        const query = qs.toString();
        return request<{
          campaigns: MarketingCampaign[];
          total: number;
          page: number;
          pageSize: number;
          summary: {
            total: number;
            active: number;
            scheduled: number;
            recipients: number;
          };
        }>(`/accounts/${accountId}/marketing/campaigns${query ? `?${query}` : ''}`, { token });
      },
      get: (accountId: string, campaignId: string, token: string) =>
        request<{ campaign: MarketingCampaign }>(
          `/accounts/${accountId}/marketing/campaigns/${campaignId}`,
          { token }
        ),
      create: (accountId: string, body: { name?: string } | undefined, token: string) =>
        request<{
          id: string;
          status: string;
          created_at: string;
          created_by: string | null;
          campaign: MarketingCampaign;
        }>(`/accounts/${accountId}/marketing/campaigns`, {
          method: 'POST',
          body: body ?? {},
          token,
        }),
      patch: (
        accountId: string,
        campaignId: string,
        body: {
          name?: string;
          currentStep?: number;
          scheduleTimezone?: string;
          scheduleMode?: 'campaign' | 'recipient_local';
          sendRateEnabled?: boolean;
          sendRatePerHour?: number;
          autoMarkBounced?: boolean;
          processUnsubscribes?: boolean;
        },
        token: string
      ) =>
        request<{ campaign: MarketingCampaign }>(
          `/accounts/${accountId}/marketing/campaigns/${campaignId}`,
          { method: 'PATCH', body, token }
        ),
      getRecipients: (accountId: string, campaignId: string, token: string) =>
        request<{
          contactIds: string[];
          recipients: CampaignRecipientDetail[];
          summary: CampaignRecipientsSummary;
        }>(`/accounts/${accountId}/marketing/campaigns/${campaignId}/recipients`, { token }),
      putRecipients: (accountId: string, campaignId: string, contactIds: string[], token: string) =>
        request<{
          selected: number;
          excluded: { suppressed: number; reasons: Record<string, number> };
          recipients: CampaignRecipientDetail[];
        }>(`/accounts/${accountId}/marketing/campaigns/${campaignId}/recipients`, {
          method: 'PUT',
          body: { contact_ids: contactIds },
          token,
        }),
      importSegment: (
        accountId: string,
        campaignId: string,
        segmentId: string,
        token: string,
        contactIds?: string[]
      ) =>
        request<{
          imported: number;
          mergedContactIds: string[];
          selected: number;
          excluded: { suppressed: number; reasons: Record<string, number> };
          recipients: CampaignRecipientDetail[];
        }>(`/accounts/${accountId}/marketing/campaigns/${campaignId}/recipients/import-segment`, {
          method: 'POST',
          body: { segment_id: segmentId, contact_ids: contactIds },
          token,
        }),
      addContact: (accountId: string, campaignId: string, contactId: string, token: string) =>
        request<{
          selected: number;
          excluded: { suppressed: number; reasons: Record<string, number> };
          recipients: CampaignRecipientDetail[];
        }>(`/accounts/${accountId}/marketing/campaigns/${campaignId}/recipients/add-contact`, {
          method: 'POST',
          body: { contact_id: contactId },
          token,
        }),
      getSteps: (accountId: string, campaignId: string, token: string) =>
        request<{ steps: CampaignStep[] }>(
          `/accounts/${accountId}/marketing/campaigns/${campaignId}/steps`,
          { token }
        ),
      putSteps: (
        accountId: string,
        campaignId: string,
        steps: {
          stepOrder: number;
          sendAt: string;
          subject: string;
          htmlBody: string;
          plainBody?: string;
          mergeConfig?: { contactMessageMode?: string };
          saveAsTemplate?: boolean;
          templateName?: string;
          sourceTemplateId?: string | null;
        }[],
        token: string
      ) =>
        request<{ steps: CampaignStep[] }>(
          `/accounts/${accountId}/marketing/campaigns/${campaignId}/steps`,
          {
            method: 'PUT',
            body: {
              steps: steps.map((s) => ({
                step_order: s.stepOrder,
                send_at: s.sendAt,
                subject: s.subject,
                html_body: s.htmlBody,
                plain_body: s.plainBody,
                merge_config: s.mergeConfig?.contactMessageMode
                  ? { contact_message_mode: s.mergeConfig.contactMessageMode }
                  : undefined,
                save_as_template: s.saveAsTemplate,
                template_name: s.templateName,
                source_template_id: s.sourceTemplateId,
              })),
            },
            token,
          }
        ),
      getSender: (accountId: string, campaignId: string, token: string) =>
        request<{ sender: CampaignSenderConfig }>(
          `/accounts/${accountId}/marketing/campaigns/${campaignId}/sender`,
          { token }
        ),
      putSender: (
        accountId: string,
        campaignId: string,
        body: {
          senderId?: string | null;
          fromName?: string;
          fromEmail?: string;
          replyTo?: string | null;
          signatureHtml?: string | null;
          useWorkspaceSignature?: boolean;
          meetingLink?: string | null;
          portfolioLink?: string | null;
        },
        token: string
      ) =>
        request<{ sender: CampaignSenderConfig }>(
          `/accounts/${accountId}/marketing/campaigns/${campaignId}/sender`,
          {
            method: 'PUT',
            body: {
              sender_id: body.senderId,
              from_name: body.fromName,
              from_email: body.fromEmail,
              reply_to: body.replyTo,
              signature_html: body.signatureHtml,
              use_workspace_signature: body.useWorkspaceSignature,
              meeting_link: body.meetingLink,
              portfolio_link: body.portfolioLink,
            },
            token,
          }
        ),
      getPreflight: (accountId: string, campaignId: string, token: string) =>
        request<PreflightResult>(
          `/accounts/${accountId}/marketing/campaigns/${campaignId}/preflight`,
          { token }
        ),
      testSend: (accountId: string, campaignId: string, token: string, toEmail?: string) =>
        request<{ ok: boolean; sentTo: string; testValid: boolean }>(
          `/accounts/${accountId}/marketing/campaigns/${campaignId}/test-send`,
          { method: 'POST', body: toEmail ? { to_email: toEmail } : {}, token }
        ),
      launch: (accountId: string, campaignId: string, token: string) =>
        request<{ status: string; launchedAt: string; launchedBy: string }>(
          `/accounts/${accountId}/marketing/campaigns/${campaignId}/launch`,
          { method: 'POST', token }
        ),
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
      control: (
        accountId: string,
        campaignId: string,
        action: 'pause' | 'cancel' | 'resume',
        token: string
      ) =>
        request<{ ok: boolean; status: string }>(
          `/accounts/${accountId}/marketing/campaigns/${campaignId}/control`,
          { method: 'POST', body: { action }, token }
        ),
      getControlPreview: (accountId: string, campaignId: string, token: string) =>
        request<{ preview: CampaignControlPreview }>(
          `/accounts/${accountId}/marketing/campaigns/${campaignId}/control`,
          { token }
        ),
      duplicate: (accountId: string, campaignId: string, token: string) =>
        request<{ campaign: MarketingCampaign }>(
          `/accounts/${accountId}/marketing/campaigns/${campaignId}/duplicate`,
          { method: 'POST', token }
        ),
      getStats: (accountId: string, campaignId: string, token: string) =>
        request<CampaignStatsResult>(
          `/accounts/${accountId}/marketing/campaigns/${campaignId}/stats`,
          { token }
        ),
      exportCsv: async (accountId: string, campaignId: string, token: string) => {
        const apiUrl = getApiUrl();
        const res = await fetch(
          `${apiUrl}/accounts/${accountId}/marketing/campaigns/${campaignId}/export`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
          throw new Error(data.message ?? data.error ?? `Export failed (${res.status})`);
        }
        return res.text();
      },
    },

    automations: {
      list: (accountId: string, token: string) =>
        request<{ automations: EmailAutomation[] }>(
          `/accounts/${accountId}/marketing/automations`,
          { token }
        ),
      create: (
        accountId: string,
        body: {
          name: string;
          senderId?: string;
          contactIds: string[];
          emails: {
            daysAfterPrevious?: number;
            sendAt: string;
            subject: string;
            htmlBody: string;
            templateId?: string;
            saveAsTemplate?: boolean;
            templateName?: string;
          }[];
        },
        token: string
      ) =>
        request<{ workflowId: string; enrolled: number; skipped: number }>(
          `/accounts/${accountId}/marketing/automations`,
          { method: 'POST', body, token }
        ),
      get: (accountId: string, automationId: string, token: string) =>
        request<{
          workflow: Record<string, unknown>;
          steps?: { stepType: string; config: Record<string, unknown> }[];
          summary: {
            totalContacts: number;
            emailsSent: number;
            opened: number;
            clicked: number;
            bounced: number;
            notOpened: number;
            openRate: number;
            clickRate: number;
          };
          recipients: AutomationRecipient[];
          emailRoute?: MarketingEmailRouteInfo;
        }>(`/accounts/${accountId}/marketing/automations/${automationId}`, { token }),
      getEdit: (accountId: string, automationId: string, token: string) =>
        request<{
          edit: {
            name: string;
            senderId: string;
            enabled: boolean;
            contactIds: string[];
            emails: {
              daysAfterPrevious?: number;
              sendAt: string;
              subject: string;
              htmlBody: string;
              templateId?: string;
            }[];
          };
        }>(`/accounts/${accountId}/marketing/automations/${automationId}?edit=1`, { token }),
      update: (
        accountId: string,
        automationId: string,
        body: {
          enabled?: boolean;
          name?: string;
          senderId?: string;
          contactIds?: string[];
          emails?: {
            daysAfterPrevious?: number;
            sendAt: string;
            subject: string;
            htmlBody: string;
            templateId?: string;
            saveAsTemplate?: boolean;
            templateName?: string;
          }[];
        },
        token: string
      ) =>
        request<{ ok: boolean }>(`/accounts/${accountId}/marketing/automations/${automationId}`, {
          method: 'PATCH',
          body,
          token,
        }),
      delete: (accountId: string, automationId: string, token: string) =>
        request<{ ok: boolean }>(`/accounts/${accountId}/marketing/automations/${automationId}`, {
          method: 'DELETE',
          token,
        }),
      processDue: (accountId: string, automationId: string, token: string) =>
        request<{ processed: number }>(
          `/accounts/${accountId}/marketing/automations/${automationId}/process`,
          { method: 'POST', token }
        ),
      enroll: (accountId: string, automationId: string, contactId: string, token: string) =>
        request<{ ok: boolean; enrolled: boolean; reason?: string }>(
          `/accounts/${accountId}/marketing/automations/${automationId}/enroll`,
          { method: 'POST', body: { contactId }, token }
        ),
      bulkEnroll: (accountId: string, automationId: string, contactIds: string[], token: string) =>
        request<{
          ok: boolean;
          enrolledCount: number;
          results: { contactId: string; enrolled: boolean; reason?: string }[];
        }>(`/accounts/${accountId}/marketing/automations/${automationId}/bulk-enroll`, {
          method: 'POST',
          body: { contactIds },
          token,
        }),
      restart: (accountId: string, automationId: string, token: string, contactIds?: string[]) =>
        request<{ ok: boolean; processed: number }>(
          `/accounts/${accountId}/marketing/automations/${automationId}/restart`,
          { method: 'POST', body: contactIds?.length ? { contactIds } : {}, token }
        ),
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
        required?: boolean;
      },
      token: string
    ) =>
      request<{ definition: CustomAttributeDefinition }>(
        `/accounts/${accountId}/custom-attributes`,
        { method: 'POST', body, token }
      ),

    update: (
      accountId: string,
      definitionId: string,
      body: { label?: string; options?: string[]; sortOrder?: number; required?: boolean },
      token: string
    ) =>
      request<{ definition: CustomAttributeDefinition }>(
        `/accounts/${accountId}/custom-attributes/${definitionId}`,
        { method: 'PATCH', body, token }
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

    ecosystem: {
      get: (accountId: string, token: string) =>
        request<{
          leadmonitorSyncEnabled: boolean;
          leadmonitorMinScore: number;
          whatsappCrmSyncEnabled: boolean;
          integrations: {
            integration_type: string;
            external_id: string;
            sync_enabled: boolean;
            settings: Record<string, unknown>;
          }[];
        }>(`/accounts/${accountId}/crm/ecosystem/provision`, { token }),

      provision: (
        accountId: string,
        body: {
          leadmonitorSyncEnabled?: boolean;
          leadmonitorMinScore?: number;
          whatsappCrmSyncEnabled?: boolean;
          leadmonitorOrgId?: string;
          whatsappAccountId?: string;
          whatsappApiKey?: string;
          whatsappBaseUrl?: string;
          provisionAttributes?: boolean;
        },
        token: string
      ) =>
        request<{
          settings: {
            leadmonitorSyncEnabled: boolean;
            leadmonitorMinScore: number;
            whatsappCrmSyncEnabled: boolean;
          };
        }>(`/accounts/${accountId}/crm/ecosystem/provision`, { method: 'POST', body, token }),
    },
  },

  enrichmentFlows: {
    list: (accountId: string, token: string) =>
      request<{
        flows: unknown[];
        mappings: unknown[];
        manualTargets: { key: string; label: string; group: string }[];
      }>(`/accounts/${accountId}/enrichment-flows`, { token }),

    create: (
      accountId: string,
      body: {
        name: string;
        triggerOn?: string;
        steps?: { stepType: string; config: Record<string, unknown> }[];
      },
      token: string
    ) =>
      request<{ flow: unknown }>(`/accounts/${accountId}/enrichment-flows`, {
        method: 'POST',
        body,
        token,
      }),

    update: (
      accountId: string,
      flowId: string,
      body: {
        name?: string;
        enabled?: boolean;
        triggerOn?: string;
        steps?: { stepType: string; config: Record<string, unknown> }[];
      },
      token: string
    ) =>
      request<{ ok: boolean }>(`/accounts/${accountId}/enrichment-flows/${flowId}`, {
        method: 'PATCH',
        body,
        token,
      }),

    saveMapping: (
      accountId: string,
      body: {
        provider: string;
        credentialId?: string | null;
        fieldMappings?: Record<
          string,
          { label: string; targetKey?: string; attrType?: string; enabled?: boolean; sortOrder?: number }
        >;
        provisionAttributes?: boolean;
      },
      token: string
    ) =>
      request<{ ok: boolean; attributes: { created: number } | null }>(
        `/accounts/${accountId}/enrichment-flows/mappings`,
        { method: 'PUT', body, token }
      ),
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
    update: (
      accountId: string,
      responseId: string,
      body: { shortcut?: string; title?: string; content?: string },
      token: string
    ) =>
      request<{ response: CannedResponse }>(
        `/accounts/${accountId}/canned-responses/${responseId}`,
        { method: 'PATCH', body, token }
      ),
    delete: (accountId: string, responseId: string, token: string) =>
      request<{ ok: boolean }>(`/accounts/${accountId}/canned-responses/${responseId}`, {
        method: 'DELETE',
        token,
      }),
    seedRecommended: (accountId: string, token: string) =>
      request<{
        ok: boolean;
        created: number;
        skipped: number;
        responses: CannedResponse[];
      }>(`/accounts/${accountId}/canned-responses/seed`, { method: 'POST', token }),
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
    update: (
      accountId: string,
      webhookId: string,
      body: { url?: string; events?: string[]; enabled?: boolean },
      token: string
    ) =>
      request<{ webhook: { id: string; url: string; events: string[]; enabled: boolean } }>(
        `/accounts/${accountId}/webhooks/${webhookId}`,
        { method: 'PATCH', body, token }
      ),
    remove: (accountId: string, webhookId: string, token: string) =>
      request<{ ok: boolean }>(`/accounts/${accountId}/webhooks/${webhookId}`, { method: 'DELETE', token }),
    deliveries: (accountId: string, webhookId: string, token: string) =>
      request<{
        deliveries: {
          id: string;
          event: string;
          status: string;
          attempts: number;
          lastError: string | null;
          createdAt: string;
          deliveredAt: string | null;
        }[];
      }>(`/accounts/${accountId}/webhooks/${webhookId}/deliveries`, { token }),
  },

  serviceCredentials: {
    list: (accountId: string, token: string, category?: string) =>
      request<{ credentials: ServiceCredential[] }>(
        `/accounts/${accountId}/service-credentials${category ? `?category=${category}` : ''}`,
        { token }
      ),
    create: (
      accountId: string,
      body: {
        category: 'email_marketing' | 'ai_chat' | 'data_enrichment';
        provider: string;
        label: string;
        secret: string;
        config?: Record<string, unknown>;
        isDefault?: boolean;
      },
      token: string
    ) =>
      request<{ credential: ServiceCredential }>(`/accounts/${accountId}/service-credentials`, {
        method: 'POST',
        body,
        token,
      }),
    update: (
      accountId: string,
      credentialId: string,
      body: { label?: string; isDefault?: boolean; config?: Record<string, unknown>; secret?: string },
      token: string
    ) =>
      request<{ ok: boolean }>(`/accounts/${accountId}/service-credentials/${credentialId}`, {
        method: 'PATCH',
        body,
        token,
      }),
    remove: (accountId: string, credentialId: string, token: string) =>
      request<{ ok: boolean }>(`/accounts/${accountId}/service-credentials/${credentialId}`, {
        method: 'DELETE',
        token,
      }),
    test: (accountId: string, credentialId: string, token: string) =>
      request<{ ok: boolean; error?: string }>(
        `/accounts/${accountId}/service-credentials/${credentialId}/test`,
        { method: 'POST', token }
      ),
  },

  ai: {
    chat: (
      accountId: string,
      body: {
        messages?: { role: 'user' | 'assistant'; content: string }[];
        system?: string;
        credentialId?: string;
        model?: string;
      },
      token: string
    ) =>
      request<{ text: string; model: string; usage?: { inputTokens?: number; outputTokens?: number } }>(
        `/accounts/${accountId}/ai/chat`,
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

    update: (
      accountId: string,
      keyId: string,
      body: { name?: string; enabled?: boolean },
      token: string
    ) =>
      request<{
        apiKey: { id: string; name: string; keyPrefix: string; scopes: string[]; enabled: boolean };
      }>(`/accounts/${accountId}/api-keys/${keyId}`, { method: 'PATCH', body, token }),
  },

  auditLogs: {
    list: (accountId: string, token: string, params?: { action?: string; since?: string; until?: string }) => {
      const qs = new URLSearchParams();
      if (params?.action) qs.set('action', params.action);
      if (params?.since) qs.set('since', params.since);
      if (params?.until) qs.set('until', params.until);
      const query = qs.toString();
      return request<{
        logs: {
          id: string;
          action: string;
          resourceType: string;
          resourceId: string | null;
          metadata: Record<string, unknown>;
          ipAddress: string | null;
          createdAt: string;
          actorName: string | null;
          actorEmail: string | null;
        }[];
      }>(`/accounts/${accountId}/audit-logs${query ? `?${query}` : ''}`, { token });
    },
  },

  teams: {
    list: (accountId: string, token: string) =>
      request<{
        teams: {
          id: string;
          name: string;
          description: string | null;
          isEnabled: boolean;
          autoAssignment: boolean;
          conversationsToday: number;
          memberCount: number;
        }[];
      }>(`/accounts/${accountId}/teams`, { token }),

    create: (accountId: string, body: { name: string; description?: string }, token: string) =>
      request<{ team: { id: string; name: string; description: string | null; autoAssignment: boolean } }>(
        `/accounts/${accountId}/teams`,
        { method: 'POST', body, token }
      ),

    update: (
      accountId: string,
      teamId: string,
      body: { name?: string; description?: string | null; isEnabled?: boolean; autoAssignment?: boolean },
      token: string
    ) =>
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

  das: {
    brand: {
      get: (accountId: string, token: string) =>
        request<{ brand: DasBrandProfile }>(
          `/accounts/${accountId}/das/brand`,
          { token }
        ),

      update: (
        accountId: string,
        body: {
          legalName?: string | null;
          logoUrl?: string | null;
          letterheadUrl?: string | null;
          settings?: Record<string, unknown>;
        },
        token: string
      ) =>
        request<{ brand: DasBrandProfile }>(
          `/accounts/${accountId}/das/brand`,
          { method: 'PUT', body, token }
        ),
    },

    assets: {
      list: (accountId: string, token: string) =>
        request<{ assets: DasAsset[] }>(
          `/accounts/${accountId}/das/assets`,
          { token }
        ),

      uploadUrl: (
        accountId: string,
        body: { contentType: string; kind: string; fileName: string },
        token: string
      ) =>
        request<{ uploadUrl: string; publicUrl: string; storageKey: string }>(
          `/accounts/${accountId}/das/assets/upload-url`,
          { method: 'POST', body, token }
        ),

      create: (
        accountId: string,
        body: {
          kind: string;
          label: string;
          fileName: string;
          mimeType: string;
          storageKey?: string;
          publicUrl?: string;
          signerName?: string | null;
          signerTitle?: string | null;
          tags?: unknown[];
        },
        token: string
      ) =>
        request<{ asset: DasAsset }>(
          `/accounts/${accountId}/das/assets`,
          { method: 'POST', body, token }
        ),

      delete: (accountId: string, assetId: string, token: string) =>
        request<{ ok: boolean }>(`/accounts/${accountId}/das/assets/${assetId}`, {
          method: 'DELETE',
          token,
        }),
    },

    products: {
      list: (accountId: string, token: string, query?: { q?: string }) => {
        const params = new URLSearchParams();
        if (query?.q) params.set('q', query.q);
        const qs = params.toString();
        return request<{ products: DasCatalogItem[] }>(
          `/accounts/${accountId}/das/products${qs ? `?${qs}` : ''}`,
          { token }
        );
      },

      create: (accountId: string, body: DasCatalogInput, token: string) =>
        request<{ product: DasCatalogItem }>(
          `/accounts/${accountId}/das/products`,
          { method: 'POST', body, token }
        ),

      update: (
        accountId: string,
        productId: string,
        body: Partial<DasCatalogInput>,
        token: string
      ) =>
        request<{ product: DasCatalogItem }>(
          `/accounts/${accountId}/das/products/${productId}`,
          { method: 'PATCH', body, token }
        ),

      delete: (accountId: string, productId: string, token: string) =>
        request<{ ok: boolean }>(`/accounts/${accountId}/das/products/${productId}`, {
          method: 'DELETE',
          token,
        }),
    },

    services: {
      list: (accountId: string, token: string, query?: { q?: string }) => {
        const params = new URLSearchParams();
        if (query?.q) params.set('q', query.q);
        const qs = params.toString();
        return request<{ services: DasCatalogItem[] }>(
          `/accounts/${accountId}/das/services${qs ? `?${qs}` : ''}`,
          { token }
        );
      },

      create: (accountId: string, body: DasCatalogInput, token: string) =>
        request<{ service: DasCatalogItem }>(
          `/accounts/${accountId}/das/services`,
          { method: 'POST', body, token }
        ),

      update: (
        accountId: string,
        serviceId: string,
        body: Partial<DasCatalogInput>,
        token: string
      ) =>
        request<{ service: DasCatalogItem }>(
          `/accounts/${accountId}/das/services/${serviceId}`,
          { method: 'PATCH', body, token }
        ),

      delete: (accountId: string, serviceId: string, token: string) =>
        request<{ ok: boolean }>(`/accounts/${accountId}/das/services/${serviceId}`, {
          method: 'DELETE',
          token,
        }),
    },

    catalog: {
      prices: {
        list: (
          accountId: string,
          token: string,
          query: { itemType: DasCatalogItemType; itemId: string }
        ) => {
          const params = new URLSearchParams({
            itemType: query.itemType,
            itemId: query.itemId,
          });
          return request<{ prices: DasCatalogPrice[] }>(
            `/accounts/${accountId}/das/catalog/prices?${params}`,
            { token }
          );
        },

        create: (
          accountId: string,
          body: {
            itemType: DasCatalogItemType;
            itemId: string;
            currency: string;
            unitPrice: number;
          },
          token: string
        ) =>
          request<{ price: DasCatalogPrice }>(
            `/accounts/${accountId}/das/catalog/prices`,
            { method: 'POST', body, token }
          ),

        update: (
          accountId: string,
          priceId: string,
          body: { currency?: string; unitPrice?: number },
          token: string
        ) =>
          request<{ price: DasCatalogPrice }>(
            `/accounts/${accountId}/das/catalog/prices/${priceId}`,
            { method: 'PATCH', body, token }
          ),

        delete: (accountId: string, priceId: string, token: string) =>
          request<{ ok: boolean }>(
            `/accounts/${accountId}/das/catalog/prices/${priceId}`,
            { method: 'DELETE', token }
          ),
      },

      components: {
        list: (
          accountId: string,
          token: string,
          query: { parentType: DasCatalogItemType; parentId: string }
        ) => {
          const params = new URLSearchParams({
            parentType: query.parentType,
            parentId: query.parentId,
          });
          return request<{ components: DasCatalogComponent[] }>(
            `/accounts/${accountId}/das/catalog/components?${params}`,
            { token }
          );
        },

        create: (
          accountId: string,
          body: {
            parentType: DasCatalogItemType;
            parentId: string;
            childType: DasCatalogItemType;
            childId: string;
            quantity?: number;
            label?: string | null;
            sortOrder?: number;
          },
          token: string
        ) =>
          request<{ component: DasCatalogComponent }>(
            `/accounts/${accountId}/das/catalog/components`,
            { method: 'POST', body, token }
          ),

        update: (
          accountId: string,
          componentId: string,
          body: {
            quantity?: number;
            label?: string | null;
            sortOrder?: number;
          },
          token: string
        ) =>
          request<{ component: DasCatalogComponent }>(
            `/accounts/${accountId}/das/catalog/components/${componentId}`,
            { method: 'PATCH', body, token }
          ),

        delete: (accountId: string, componentId: string, token: string) =>
          request<{ ok: boolean }>(
            `/accounts/${accountId}/das/catalog/components/${componentId}`,
            { method: 'DELETE', token }
          ),
      },
    },

    templates: {
      list: (
        accountId: string,
        token: string,
        query?: { type?: string; active?: boolean }
      ) => {
        const params = new URLSearchParams();
        if (query?.type) params.set('type', query.type);
        if (query?.active != null) params.set('active', String(query.active));
        const qs = params.toString();
        return request<{ templates: DasTemplate[] }>(
          `/accounts/${accountId}/das/templates${qs ? `?${qs}` : ''}`,
          { token }
        );
      },

      create: (
        accountId: string,
        body: {
          name: string;
          type: DasDocument['type'];
          version?: number;
          body?: Record<string, unknown>;
          handlebarsHtml?: string | null;
          isActive?: boolean;
        },
        token: string
      ) =>
        request<{ template: DasTemplate }>(
          `/accounts/${accountId}/das/templates`,
          { method: 'POST', body, token }
        ),

      update: (
        accountId: string,
        templateId: string,
        body: {
          name?: string;
          type?: DasDocument['type'];
          version?: number;
          body?: Record<string, unknown>;
          handlebarsHtml?: string | null;
          isActive?: boolean;
        },
        token: string
      ) =>
        request<{ template: DasTemplate }>(
          `/accounts/${accountId}/das/templates/${templateId}`,
          { method: 'PATCH', body, token }
        ),

      delete: (accountId: string, templateId: string, token: string) =>
        request<{ ok: boolean }>(`/accounts/${accountId}/das/templates/${templateId}`, {
          method: 'DELETE',
          token,
        }),
    },

    clients: {
      list: (accountId: string, token: string, query?: { q?: string }) => {
        const params = new URLSearchParams();
        if (query?.q) params.set('q', query.q);
        const qs = params.toString();
        return request<{ clients: DasClient[] }>(
          `/accounts/${accountId}/das/clients${qs ? `?${qs}` : ''}`,
          { token }
        );
      },

      create: (
        accountId: string,
        body: {
          name: string;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          address?: string | null;
          notes?: string | null;
          contactId?: string | null;
        },
        token: string
      ) =>
        request<{ client: DasClient }>(
          `/accounts/${accountId}/das/clients`,
          { method: 'POST', body, token }
        ),

      update: (
        accountId: string,
        clientId: string,
        body: {
          name?: string;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          address?: string | null;
          notes?: string | null;
          contactId?: string | null;
        },
        token: string
      ) =>
        request<{ client: DasClient }>(
          `/accounts/${accountId}/das/clients/${clientId}`,
          { method: 'PATCH', body, token }
        ),

      delete: (accountId: string, clientId: string, token: string) =>
        request<{ ok: boolean }>(`/accounts/${accountId}/das/clients/${clientId}`, {
          method: 'DELETE',
          token,
        }),
    },

    audit: {
      list: (
        accountId: string,
        token: string,
        query?: { limit?: number; offset?: number }
      ) => {
        const params = new URLSearchParams();
        if (query?.limit != null) params.set('limit', String(query.limit));
        if (query?.offset != null) params.set('offset', String(query.offset));
        const qs = params.toString();
        return request<{ logs: DasAuditLog[]; total: number }>(
          `/accounts/${accountId}/das/audit${qs ? `?${qs}` : ''}`,
          { token }
        );
      },
    },

    notifications: {
      list: (
        accountId: string,
        token: string,
        query?: { unreadOnly?: boolean; limit?: number; offset?: number }
      ) => {
        const params = new URLSearchParams();
        if (query?.unreadOnly) params.set('unreadOnly', 'true');
        if (query?.limit != null) params.set('limit', String(query.limit));
        if (query?.offset != null) params.set('offset', String(query.offset));
        const qs = params.toString();
        return request<{
          notifications: DasNotification[];
          total: number;
          unreadCount: number;
        }>(`/accounts/${accountId}/das/notifications${qs ? `?${qs}` : ''}`, {
          token,
        });
      },

      markRead: (
        accountId: string,
        body: { ids?: string[]; markAllRead?: boolean },
        token: string
      ) =>
        request<{ ok: boolean }>(`/accounts/${accountId}/das/notifications`, {
          method: 'PATCH',
          body,
          token,
        }),
    },

    documents: {
      list: (
        accountId: string,
        token: string,
        query?: {
          q?: string;
          status?: string;
          type?: string;
          contactId?: string;
          limit?: number;
          offset?: number;
        }
      ) => {
        const params = new URLSearchParams();
        if (query?.q) params.set('q', query.q);
        if (query?.status) params.set('status', query.status);
        if (query?.type) params.set('type', query.type);
        if (query?.contactId) params.set('contactId', query.contactId);
        if (query?.limit != null) params.set('limit', String(query.limit));
        if (query?.offset != null) params.set('offset', String(query.offset));
        const qs = params.toString();
        return request<{ documents: DasDocument[]; total: number }>(
          `/accounts/${accountId}/das/documents${qs ? `?${qs}` : ''}`,
          { token }
        );
      },

      get: (accountId: string, documentId: string, token: string) =>
        request<{ document: DasDocument; security: DasDocumentSecurity | null }>(
          `/accounts/${accountId}/das/documents/${documentId}`,
          { token }
        ),

      create: (
        accountId: string,
        body: {
          type: DasDocument['type'];
          title: string;
          contactId?: string | null;
          templateId?: string | null;
          structuredData?: Record<string, unknown>;
        },
        token: string
      ) =>
        request<{ document: DasDocument }>(`/accounts/${accountId}/das/documents`, {
          method: 'POST',
          body,
          token,
        }),

      update: (
        accountId: string,
        documentId: string,
        body: {
          title?: string;
          status?: DasDocument['status'];
          contactId?: string | null;
          clientId?: string | null;
          templateId?: string | null;
          structuredData?: Record<string, unknown>;
        },
        token: string
      ) =>
        request<{ document: DasDocument }>(
          `/accounts/${accountId}/das/documents/${documentId}`,
          { method: 'PATCH', body, token }
        ),

      render: (accountId: string, documentId: string, token: string) =>
        request<{ document: DasDocument; html: string }>(
          `/accounts/${accountId}/das/documents/${documentId}/render`,
          { method: 'POST', token }
        ),

      finalize: (accountId: string, documentId: string, token: string) =>
        request<{ document: DasDocument; security: DasDocumentSecurity }>(
          `/accounts/${accountId}/das/documents/${documentId}/finalize`,
          { method: 'POST', token }
        ),

      pdf: (accountId: string, documentId: string, token: string) =>
        request<{ pdfUrl: string; publicUrl: string }>(
          `/accounts/${accountId}/das/documents/${documentId}/pdf`,
          { method: 'POST', token }
        ),
    },

    verify: {
      get: (token: string) =>
        request<DasVerifyResult>(`/das/verify/${encodeURIComponent(token)}`),
    },
  },
};
