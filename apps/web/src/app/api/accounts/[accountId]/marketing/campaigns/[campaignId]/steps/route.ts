import { neon } from '@/lib/neon';
import { z } from 'zod';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { MarketingError, MarketingErrorCode, marketingErrorResponse } from '@/lib/marketing/errors';
import { getCampaignSteps, putCampaignSteps } from '@/lib/marketing/s6m-campaign-steps';

type Params = { params: Promise<{ accountId: string; campaignId: string }> };

const mergeConfigSchema = z.object({
  contact_message_mode: z
    .enum(['latest_note', 'latest_inbound_chat', 'latest_note_or_chat'])
    .optional(),
  contactMessageMode: z
    .enum(['latest_note', 'latest_inbound_chat', 'latest_note_or_chat'])
    .optional(),
});

const stepSchema = z.object({
  step_order: z.number().int().min(1),
  send_at: z.string().min(1),
  subject: z.string(),
  html_body: z.string(),
  plain_body: z.string().optional(),
  merge_config: mergeConfigSchema.optional(),
  save_as_template: z.boolean().optional(),
  template_name: z.string().optional(),
  source_template_id: z.string().uuid().nullable().optional(),
  attachments: z.unknown().optional(),
});

const putBodySchema = z.object({
  steps: z.array(stepSchema).min(1),
  attachments: z.unknown().optional(),
});

function mapStepInput(
  s: z.infer<typeof stepSchema>
): Parameters<typeof putCampaignSteps>[3][number] {
  const mode = s.merge_config?.contact_message_mode ?? s.merge_config?.contactMessageMode;
  return {
    stepOrder: s.step_order,
    sendAt: s.send_at,
    subject: s.subject,
    htmlBody: s.html_body,
    plainBody: s.plain_body,
    mergeConfig: mode ? { contactMessageMode: mode } : {},
    saveAsTemplate: s.save_as_template,
    templateName: s.template_name,
    sourceTemplateId: s.source_template_id,
  };
}

export async function GET(req: Request, { params }: Params) {
  try {
    const { accountId, campaignId } = await params;
    const token = getBearerToken(req);
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await authorizeAccount(token, accountId);
    if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sql = neon(process.env.DATABASE_URL!);
    const steps = await getCampaignSteps(sql, accountId, campaignId);
    return Response.json({
      steps: steps.map((s) => ({
        id: s.id,
        stepOrder: s.stepOrder,
        sendAt: s.sendAt,
        subject: s.subject,
        htmlBody: s.htmlBody,
        plainBody: s.plainBody,
        mergeConfig: {
          contactMessageMode: s.mergeConfig.contactMessageMode ?? null,
        },
        saveAsTemplate: s.saveAsTemplate,
        templateName: s.templateName,
        sourceTemplateId: s.sourceTemplateId,
      })),
    });
  } catch (err) {
    return marketingErrorResponse(err);
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const { accountId, campaignId } = await params;
    const token = getBearerToken(req);
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await authorizeAccount(token, accountId);
    if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = putBodySchema.parse(await req.json());
    if (body.attachments != null) {
      throw new MarketingError(MarketingErrorCode.ATTACHMENTS_NOT_ALLOWED);
    }
    for (const s of body.steps) {
      if (s.attachments != null) {
        throw new MarketingError(MarketingErrorCode.ATTACHMENTS_NOT_ALLOWED);
      }
    }
    const sql = neon(process.env.DATABASE_URL!);
    const steps = await putCampaignSteps(
      sql,
      accountId,
      campaignId,
      body.steps.map(mapStepInput)
    );

    return Response.json({
      steps: steps.map((s) => ({
        id: s.id,
        stepOrder: s.stepOrder,
        sendAt: s.sendAt,
        subject: s.subject,
        htmlBody: s.htmlBody,
        plainBody: s.plainBody,
        mergeConfig: {
          contactMessageMode: s.mergeConfig.contactMessageMode ?? null,
        },
        saveAsTemplate: s.saveAsTemplate,
        templateName: s.templateName,
        sourceTemplateId: s.sourceTemplateId,
      })),
    });
  } catch (err) {
    return marketingErrorResponse(err);
  }
}
