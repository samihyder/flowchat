import type { AppSql } from '@/lib/db-sql';

export type AiAssistant = {
  id: string;
  accountId: string;
  name: string;
  model: string;
  temperature: number;
  guidelines: string | null;
  credentialId: string | null;
  inboxId: string | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AiDocument = {
  id: string;
  accountId: string;
  assistantId: string | null;
  title: string;
  sourceType: string;
  sourceUrl: string | null;
  status: string;
  chunkCount: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AiTool = {
  id: string;
  accountId: string;
  assistantId: string | null;
  name: string;
  description: string | null;
  toolType: string;
  httpUrl: string | null;
  httpMethod: string | null;
  paramSchema: Record<string, unknown>;
  isEnabled: boolean;
  createdAt: string;
};

export type CopilotThread = {
  id: string;
  accountId: string;
  conversationId: string;
  userId: string;
  assistantId: string | null;
  messages: { role: string; content: string; at?: string }[];
  createdAt: string;
  updatedAt: string;
};

type AssistantRow = {
  id: string;
  accountId: string;
  name: string;
  model: string;
  temperature: number;
  guidelines: string | null;
  credentialId: string | null;
  inboxId: string | null;
  isEnabled: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function serializeAssistant(row: AssistantRow): AiAssistant {
  return {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function listAssistants(sql: AppSql, accountId: string): Promise<AiAssistant[]> {
  const rows = await sql`
    SELECT id, account_id as "accountId", name, model, temperature, guidelines,
           credential_id as "credentialId", inbox_id as "inboxId",
           is_enabled as "isEnabled", created_at as "createdAt", updated_at as "updatedAt"
    FROM ai_assistants WHERE account_id = ${accountId}::uuid ORDER BY name
  `;
  return (rows as AssistantRow[]).map(serializeAssistant);
}

export async function getAssistant(
  sql: AppSql,
  accountId: string,
  assistantId: string
): Promise<AiAssistant | null> {
  const rows = await sql`
    SELECT id, account_id as "accountId", name, model, temperature, guidelines,
           credential_id as "credentialId", inbox_id as "inboxId",
           is_enabled as "isEnabled", created_at as "createdAt", updated_at as "updatedAt"
    FROM ai_assistants
    WHERE id = ${assistantId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const row = rows[0] as AssistantRow | undefined;
  return row ? serializeAssistant(row) : null;
}

export async function createAssistant(
  sql: AppSql,
  accountId: string,
  input: {
    name: string;
    model?: string;
    temperature?: number;
    guidelines?: string | null;
    credentialId?: string | null;
    inboxId?: string | null;
    isEnabled?: boolean;
  }
): Promise<AiAssistant> {
  const rows = await sql`
    INSERT INTO ai_assistants (
      account_id, name, model, temperature, guidelines, credential_id, inbox_id, is_enabled
    )
    VALUES (
      ${accountId}::uuid, ${input.name},
      ${input.model ?? 'claude-sonnet-4-20250514'},
      ${input.temperature ?? 0.3},
      ${input.guidelines ?? null},
      ${input.credentialId ?? null}::uuid,
      ${input.inboxId ?? null}::uuid,
      ${input.isEnabled ?? true}
    )
    RETURNING id, account_id as "accountId", name, model, temperature, guidelines,
              credential_id as "credentialId", inbox_id as "inboxId",
              is_enabled as "isEnabled", created_at as "createdAt", updated_at as "updatedAt"
  `;
  return serializeAssistant(rows[0] as AssistantRow);
}

export async function updateAssistant(
  sql: AppSql,
  accountId: string,
  assistantId: string,
  input: Partial<{
    name: string;
    model: string;
    temperature: number;
    guidelines: string | null;
    credentialId: string | null;
    inboxId: string | null;
    isEnabled: boolean;
  }>
): Promise<AiAssistant | null> {
  const rows = await sql`
    UPDATE ai_assistants SET
      name = COALESCE(${input.name ?? null}, name),
      model = COALESCE(${input.model ?? null}, model),
      temperature = COALESCE(${input.temperature ?? null}, temperature),
      guidelines = COALESCE(${input.guidelines ?? null}, guidelines),
      credential_id = COALESCE(${input.credentialId ?? null}::uuid, credential_id),
      inbox_id = COALESCE(${input.inboxId ?? null}::uuid, inbox_id),
      is_enabled = COALESCE(${input.isEnabled ?? null}, is_enabled),
      updated_at = NOW()
    WHERE id = ${assistantId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id, account_id as "accountId", name, model, temperature, guidelines,
              credential_id as "credentialId", inbox_id as "inboxId",
              is_enabled as "isEnabled", created_at as "createdAt", updated_at as "updatedAt"
  `;
  const row = rows[0] as AssistantRow | undefined;
  return row ? serializeAssistant(row) : null;
}

export async function deleteAssistant(
  sql: AppSql,
  accountId: string,
  assistantId: string
): Promise<boolean> {
  const rows = await sql`
    DELETE FROM ai_assistants
    WHERE id = ${assistantId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id
  `;
  return rows.length > 0;
}

export async function listDocuments(
  sql: AppSql,
  accountId: string,
  assistantId?: string
): Promise<AiDocument[]> {
  const rows = assistantId
    ? await sql`
        SELECT id, account_id as "accountId", assistant_id as "assistantId", title,
               source_type as "sourceType", source_url as "sourceUrl", status,
               chunk_count as "chunkCount", error_message as "errorMessage",
               created_at as "createdAt", updated_at as "updatedAt"
        FROM ai_documents
        WHERE account_id = ${accountId}::uuid AND assistant_id = ${assistantId}::uuid
        ORDER BY created_at DESC
      `
    : await sql`
        SELECT id, account_id as "accountId", assistant_id as "assistantId", title,
               source_type as "sourceType", source_url as "sourceUrl", status,
               chunk_count as "chunkCount", error_message as "errorMessage",
               created_at as "createdAt", updated_at as "updatedAt"
        FROM ai_documents
        WHERE account_id = ${accountId}::uuid
        ORDER BY created_at DESC
      `;
  return (rows as AiDocument[]).map((r) => ({
    ...r,
    createdAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt).toISOString(),
  }));
}

export async function createDocument(
  sql: AppSql,
  accountId: string,
  input: {
    assistantId?: string | null;
    title: string;
    sourceType: string;
    sourceUrl?: string | null;
  }
): Promise<AiDocument> {
  const rows = await sql`
    INSERT INTO ai_documents (account_id, assistant_id, title, source_type, source_url, status)
    VALUES (
      ${accountId}::uuid, ${input.assistantId ?? null}::uuid,
      ${input.title}, ${input.sourceType}, ${input.sourceUrl ?? null}, 'pending'
    )
    RETURNING id, account_id as "accountId", assistant_id as "assistantId", title,
              source_type as "sourceType", source_url as "sourceUrl", status,
              chunk_count as "chunkCount", error_message as "errorMessage",
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  const r = rows[0] as AiDocument;
  return {
    ...r,
    createdAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt).toISOString(),
  };
}

export async function listTools(
  sql: AppSql,
  accountId: string,
  assistantId?: string
): Promise<AiTool[]> {
  const rows = assistantId
    ? await sql`
        SELECT id, account_id as "accountId", assistant_id as "assistantId", name, description,
               tool_type as "toolType", http_url as "httpUrl", http_method as "httpMethod",
               param_schema as "paramSchema", is_enabled as "isEnabled", created_at as "createdAt"
        FROM ai_tools
        WHERE account_id = ${accountId}::uuid AND assistant_id = ${assistantId}::uuid
        ORDER BY name
      `
    : await sql`
        SELECT id, account_id as "accountId", assistant_id as "assistantId", name, description,
               tool_type as "toolType", http_url as "httpUrl", http_method as "httpMethod",
               param_schema as "paramSchema", is_enabled as "isEnabled", created_at as "createdAt"
        FROM ai_tools
        WHERE account_id = ${accountId}::uuid
        ORDER BY name
      `;
  return (rows as AiTool[]).map((r) => ({
    ...r,
    paramSchema: r.paramSchema ?? {},
    createdAt: new Date(r.createdAt).toISOString(),
  }));
}

export async function createTool(
  sql: AppSql,
  accountId: string,
  input: {
    assistantId?: string | null;
    name: string;
    description?: string | null;
    toolType?: string;
    httpUrl?: string | null;
    httpMethod?: string;
    paramSchema?: Record<string, unknown>;
  }
): Promise<AiTool> {
  const rows = await sql`
    INSERT INTO ai_tools (
      account_id, assistant_id, name, description, tool_type, http_url, http_method, param_schema
    )
    VALUES (
      ${accountId}::uuid, ${input.assistantId ?? null}::uuid, ${input.name},
      ${input.description ?? null}, ${input.toolType ?? 'builtin'},
      ${input.httpUrl ?? null}, ${input.httpMethod ?? 'POST'},
      ${JSON.stringify(input.paramSchema ?? {})}::jsonb
    )
    RETURNING id, account_id as "accountId", assistant_id as "assistantId", name, description,
              tool_type as "toolType", http_url as "httpUrl", http_method as "httpMethod",
              param_schema as "paramSchema", is_enabled as "isEnabled", created_at as "createdAt"
  `;
  const r = rows[0] as AiTool;
  return { ...r, paramSchema: r.paramSchema ?? {}, createdAt: new Date(r.createdAt).toISOString() };
}

export async function getOrCreateCopilotThread(
  sql: AppSql,
  accountId: string,
  conversationId: string,
  userId: string,
  assistantId?: string | null
): Promise<CopilotThread> {
  const existing = await sql`
    SELECT id, account_id as "accountId", conversation_id as "conversationId",
           user_id as "userId", assistant_id as "assistantId", messages,
           created_at as "createdAt", updated_at as "updatedAt"
    FROM ai_copilot_threads
    WHERE conversation_id = ${conversationId}::uuid AND user_id = ${userId}::uuid
    LIMIT 1
  `;
  if (existing[0]) {
    const r = existing[0] as CopilotThread & { messages: unknown };
    return {
      ...r,
      messages: Array.isArray(r.messages) ? r.messages : [],
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
    };
  }

  const rows = await sql`
    INSERT INTO ai_copilot_threads (account_id, conversation_id, user_id, assistant_id, messages)
    VALUES (
      ${accountId}::uuid, ${conversationId}::uuid, ${userId}::uuid,
      ${assistantId ?? null}::uuid, '[]'::jsonb
    )
    RETURNING id, account_id as "accountId", conversation_id as "conversationId",
              user_id as "userId", assistant_id as "assistantId", messages,
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  const r = rows[0] as CopilotThread;
  return {
    ...r,
    messages: [],
    createdAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt).toISOString(),
  };
}

export async function appendCopilotMessage(
  sql: AppSql,
  accountId: string,
  conversationId: string,
  userId: string,
  message: { role: string; content: string }
): Promise<CopilotThread> {
  const thread = await getOrCreateCopilotThread(sql, accountId, conversationId, userId);
  const next = [
    ...thread.messages,
    { ...message, at: new Date().toISOString() },
  ];
  const rows = await sql`
    UPDATE ai_copilot_threads SET
      messages = ${JSON.stringify(next)}::jsonb,
      updated_at = NOW()
    WHERE id = ${thread.id}::uuid AND account_id = ${accountId}::uuid
    RETURNING id, account_id as "accountId", conversation_id as "conversationId",
              user_id as "userId", assistant_id as "assistantId", messages,
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  const r = rows[0] as CopilotThread;
  return {
    ...r,
    messages: Array.isArray(r.messages) ? r.messages : next,
    createdAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt).toISOString(),
  };
}
