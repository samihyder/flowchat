/**
 * Minimal Handlebars-like renderer for Documents templates.
 * Supports {{path.to.value}}, {{{rawHtml}}}, and {{#each array}}...{{/each}}.
 */

function getPath(ctx: unknown, path: string): unknown {
  if (!path) return ctx;
  const parts = path.split('.');
  let cur: unknown = ctx;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function escapeHtml(value: unknown): string {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderSection(template: string, ctx: unknown): string {
  const eachRe = /\{\{#each\s+([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
  let out = template.replace(eachRe, (_m, path: string, inner: string) => {
    const arr = getPath(ctx, path);
    if (!Array.isArray(arr)) return '';
    return arr
      .map((item, index) =>
        renderSection(inner, {
          ...(typeof item === 'object' && item ? item : { this: item }),
          '@index': index,
          '@first': index === 0,
          '@last': index === arr.length - 1,
        })
      )
      .join('');
  });

  out = out.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_m, path: string) => {
    const v = getPath(ctx, path);
    return v == null ? '' : String(v);
  });

  out = out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, path: string) => escapeHtml(getPath(ctx, path)));
  return out;
}

export type DasRenderContext = {
  document: {
    title: string;
    type: string;
    status: string;
    id: string;
  };
  brand: {
    legalName: string;
    logoUrl: string | null;
    letterheadUrl: string | null;
  };
  contact: {
    name: string;
    email: string;
    phone: string;
    company: string;
  };
  client: {
    name: string;
    email: string;
    phone: string;
    company: string;
    address: string;
  };
  lineItems: Array<{
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    currency: string;
    total: number;
  }>;
  totals: {
    subtotal: number;
    currency: string;
  };
  meta: {
    createdAt: string;
    finalizedAt: string | null;
    verificationUrl?: string;
  };
  structured: Record<string, unknown>;
};

export function renderDasTemplate(handlebarsHtml: string, context: DasRenderContext): string {
  return renderSection(handlebarsHtml, context);
}

export function defaultDocumentHtml(context: DasRenderContext): string {
  const rows = context.lineItems
    .map(
      (li) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb">${escapeHtml(li.name)}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${li.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${li.unitPrice.toFixed(2)} ${escapeHtml(li.currency)}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${li.total.toFixed(2)}</td>
        </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(context.document.title)}</title></head>
<body style="font-family:system-ui,sans-serif;color:#111827;max-width:800px;margin:40px auto;padding:0 24px">
  ${context.brand.logoUrl ? `<img src="${escapeHtml(context.brand.logoUrl)}" alt="" style="max-height:48px;margin-bottom:16px"/>` : ''}
  <p style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;margin:0">${escapeHtml(context.document.type)}</p>
  <h1 style="font-size:28px;margin:4px 0 8px">${escapeHtml(context.document.title)}</h1>
  <p style="color:#6b7280;font-size:14px;margin:0 0 24px">${escapeHtml(context.brand.legalName || 'Company')}</p>
  <div style="display:flex;gap:32px;margin-bottom:32px;font-size:14px">
    <div>
      <p style="color:#9ca3af;font-size:11px;text-transform:uppercase;margin:0 0 4px">Bill to</p>
      <p style="margin:0;font-weight:600">${escapeHtml(context.contact.name || context.client.name || '—')}</p>
      <p style="margin:4px 0 0;color:#6b7280">${escapeHtml(context.contact.email || context.client.email || '')}</p>
      <p style="margin:4px 0 0;color:#6b7280">${escapeHtml(context.client.address || '')}</p>
    </div>
  </div>
  ${
    context.lineItems.length
      ? `<table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
    <thead><tr style="background:#f9fafb;text-align:left">
      <th style="padding:8px">Item</th><th style="padding:8px;text-align:right">Qty</th>
      <th style="padding:8px;text-align:right">Price</th><th style="padding:8px;text-align:right">Total</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="text-align:right;font-weight:600">Subtotal: ${context.totals.subtotal.toFixed(2)} ${escapeHtml(context.totals.currency)}</p>`
      : '<p style="color:#9ca3af;font-size:14px">No line items</p>'
  }
</body></html>`;
}

export function buildLineItems(structured: Record<string, unknown>): DasRenderContext['lineItems'] {
  const raw = structured.lineItems;
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const quantity = Number(row.quantity ?? 1) || 0;
    const unitPrice = Number(row.unitPrice ?? row.unit_price ?? 0) || 0;
    const currency = String(row.currency ?? 'USD');
    return {
      name: String(row.name ?? row.title ?? 'Item'),
      description: row.description != null ? String(row.description) : undefined,
      quantity,
      unitPrice,
      currency,
      total: quantity * unitPrice,
    };
  });
}

export function buildDasRenderContext(input: {
  document: {
    id: string;
    title: string;
    type: string;
    status: string;
    structuredData: Record<string, unknown>;
    createdAt: string;
    finalizedAt: string | null;
  };
  brand?: {
    legalName?: string | null;
    logoUrl?: string | null;
    letterheadUrl?: string | null;
  } | null;
  contact?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
  } | null;
  client?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    address?: string | null;
  } | null;
  verificationUrl?: string;
}): DasRenderContext {
  const structured = input.document.structuredData ?? {};
  const lineItems = buildLineItems(structured);
  const currency =
    lineItems[0]?.currency ??
    (typeof structured.currency === 'string' ? structured.currency : 'USD');
  const subtotal = lineItems.reduce((sum, li) => sum + li.total, 0);

  return {
    document: {
      id: input.document.id,
      title: input.document.title,
      type: input.document.type,
      status: input.document.status,
    },
    brand: {
      legalName: input.brand?.legalName ?? '',
      logoUrl: input.brand?.logoUrl ?? null,
      letterheadUrl: input.brand?.letterheadUrl ?? null,
    },
    contact: {
      name: input.contact?.name ?? '',
      email: input.contact?.email ?? '',
      phone: input.contact?.phone ?? '',
      company: input.contact?.company ?? '',
    },
    client: {
      name: input.client?.name ?? '',
      email: input.client?.email ?? '',
      phone: input.client?.phone ?? '',
      company: input.client?.company ?? '',
      address: input.client?.address ?? '',
    },
    lineItems,
    totals: { subtotal, currency },
    meta: {
      createdAt: input.document.createdAt,
      finalizedAt: input.document.finalizedAt,
      verificationUrl: input.verificationUrl,
    },
    structured,
  };
}

export function renderDocumentHtml(
  handlebarsHtml: string | null | undefined,
  context: DasRenderContext
): string {
  if (handlebarsHtml?.trim()) {
    return renderDasTemplate(handlebarsHtml, context);
  }
  return defaultDocumentHtml(context);
}
